import { clickDetector } from "./detectors/click";
import { deadDetector } from "./detectors/dead";
import { errorDetector } from "./detectors/error";
import { formDetector } from "./detectors/form";
import { rageDetector } from "./detectors/rage";
import { createTransport } from "./transport";
import type { Detector, Emit, StuckEvent, StuckpointOptions } from "./types";

export type { ClickEvent, Payload, StuckEvent, StuckpointOptions, StuckType, VisitEvent } from "./types";
export { getLabel, getSelector } from "./selector";

export interface StuckpointInstance {
  /** 모아둔 이벤트를 지금 보낸다 */
  flush(): void;
  /** 남은 기록을 보내고, 감지를 멈추고, 이벤트 리스너를 모두 뗀다 */
  destroy(): void;
}

const NOOP: StuckpointInstance = { flush() {}, destroy() {} };

function session(sampleRate: number): { sid: string; sampled: boolean } {
  const make = () => Math.random().toString(36).slice(2, 10);
  try {
    let sid = sessionStorage.getItem("stuckpoint:sid");
    let sampled = sessionStorage.getItem("stuckpoint:sampled");
    if (!sid) {
      sid = make();
      sampled = Math.random() < sampleRate ? "1" : "0";
      sessionStorage.setItem("stuckpoint:sid", sid);
      sessionStorage.setItem("stuckpoint:sampled", sampled);
    }
    return { sid, sampled: sampled === "1" };
  } catch {
    // 시크릿 모드 등 저장소가 막혀 있으면 이 페이지에서만 쓰는 id
    return { sid: make(), sampled: Math.random() < sampleRate };
  }
}

/**
 * 기록하지 않을 방문인지.
 * - 사이트 주인: 주소에 ?stuckpoint=off 를 한 번 붙여 열면 이 브라우저는 계속 빠진다 (?stuckpoint=on 으로 되돌림)
 * - 자동화 브라우저(navigator.webdriver): 테스트 · 크롤러가 통계를 오염시키지 않게
 */
function optedOut(): boolean {
  if (navigator.webdriver) return true;
  try {
    const flag = new URLSearchParams(location.search).get("stuckpoint");
    if (flag === "off") localStorage.setItem("stuckpoint:optout", "1");
    if (flag === "on") localStorage.removeItem("stuckpoint:optout");
    return localStorage.getItem("stuckpoint:optout") === "1";
  } catch {
    return false;
  }
}

/** 이번 방문에서 이미 센 경로 (새로고침 · 재설치해도 중복으로 세지 않게 sessionStorage에 둔다) */
function visitedPages(): Set<string> {
  try {
    return new Set(JSON.parse(sessionStorage.getItem("stuckpoint:visited") || "[]") as string[]);
  } catch {
    return new Set();
  }
}

function saveVisited(pages: Set<string>) {
  try {
    sessionStorage.setItem("stuckpoint:visited", JSON.stringify([...pages].slice(-200)));
  } catch {
    // 저장소가 막혀 있으면 이 페이지에서만 기억한다
  }
}

/** history API를 감싸 경로가 바뀔 때마다 알려준다. 해제하면 원래 함수로 되돌린다 */
function watchRoute(onChange: (page: string) => void): () => void {
  const { pushState, replaceState } = history;
  // 주소는 pushState 직후 바로 바뀐다 → 경로를 지금 읽어 두고, 기록은 잠시 뒤에
  // (화면 전환과 함께 SDK가 정리되는 경우 다음 페이지를 방문으로 잘못 세지 않게)
  const notify = () => {
    const page = location.pathname;
    setTimeout(() => onChange(page), 100);
  };
  history.pushState = function (...args: Parameters<History["pushState"]>) {
    pushState.apply(this, args);
    notify();
  };
  history.replaceState = function (...args: Parameters<History["replaceState"]>) {
    replaceState.apply(this, args);
    notify();
  };
  window.addEventListener("popstate", notify);
  // 프레임워크가 감싸기 전의 원래 pushState를 직접 부르면(Next.js App Router 등) 위 감싸기가 못 본다 → 1초마다 경로도 확인
  let last = location.pathname;
  const poll = setInterval(() => {
    if (location.pathname !== last) {
      last = location.pathname;
      onChange(last);
    }
  }, 1000);
  return () => {
    history.pushState = pushState;
    history.replaceState = replaceState;
    window.removeEventListener("popstate", notify);
    clearInterval(poll);
  };
}

/**
 * 감지를 시작한다.
 *
 * ```ts
 * import { init } from "stuckpoint";
 * init({ endpoint: "https://stuckpoint.vercel.app/api/collect", projectKey: "my-site" });
 * ```
 */
export function init(options: StuckpointOptions): StuckpointInstance {
  if (typeof window === "undefined" || typeof document === "undefined") return NOOP; // SSR
  if (optedOut()) return NOOP;

  const { sid, sampled } = session(options.sampleRate ?? 1);
  if (!sampled) return NOOP;

  const transport = createTransport(options.endpoint, options.projectKey);

  const emit: Emit = (partial) => {
    const event: StuckEvent = {
      ...partial,
      page: partial.page ?? location.pathname,
      vw: window.innerWidth,
      sid,
      ts: Date.now(),
    };
    if (options.debug) console.info("[stuckpoint]", event.type, event.label, event);
    if (options.onEvent?.(event) === false) return;
    transport.push(event);
  };

  const ignore = options.ignore;
  const detectors: Detector[] = [
    rageDetector(emit, { clicks: options.rageClicks ?? 3, window: options.rageWindow ?? 800, ignore }),
    deadDetector(emit, { delay: options.deadDelay ?? 1000, ignore }),
    errorDetector(emit, { ignore }),
    formDetector(emit, { ignore }),
  ];
  if (options.trackClicks) {
    detectors.push(clickDetector((e) => transport.push({ ...e, vw: window.innerWidth, sid, ts: Date.now() }), { ignore }));
  }

  // 방문: 경로마다 한 번. SPA 이동(pushState · replaceState · 뒤로가기)도 따라간다
  const visited = visitedPages();
  let destroyed = false;
  const visit = (page = location.pathname) => {
    if (destroyed) return;
    if (visited.has(page)) return;
    visited.add(page);
    saveVisited(visited);
    transport.push({ type: "visit", page, vw: window.innerWidth, sid, ts: Date.now() });
  };
  visit();
  const unwatch = watchRoute(visit);

  // 페이지를 떠나기 직전: 진행 중인 연타 · 쓰다 만 폼을 정리하고 sendBeacon으로 보낸다
  const onHide = () => {
    if (document.visibilityState !== "hidden") return;
    detectors.forEach((d) => d.flush?.());
    transport.flush(true);
  };
  const onPageHide = () => {
    detectors.forEach((d) => d.flush?.());
    transport.flush(true);
  };
  document.addEventListener("visibilitychange", onHide);
  window.addEventListener("pagehide", onPageHide);

  return {
    flush() {
      detectors.forEach((d) => d.flush?.());
      transport.flush();
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      // SPA에서 화면을 떠나며 정리될 때 쓰다 만 폼 · 모아둔 이벤트를 버리지 않고 보낸다
      detectors.forEach((d) => d.flush?.());
      transport.flush();
      detectors.forEach((d) => d.stop());
      transport.stop();
      unwatch();
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", onPageHide);
    },
  };
}
