import { getLabel, getSelector } from "../selector";
import type { Detector, Emit } from "../types";

const RADIUS = 32;

/**
 * 분노 클릭: 같은 자리(반경 32px)를 짧은 시간(기본 800ms) 안에 N번(기본 3번) 이상 누름.
 * 연타가 이어지는 동안은 한 번만 보내고, 연타가 끝나면 최종 횟수로 보낸다.
 */
export function rageDetector(emit: Emit, opts: { clicks: number; window: number; ignore?: string }): Detector {
  let clicks: { x: number; y: number; t: number }[] = [];
  let target: Element | null = null;
  let page = "";
  let timer: ReturnType<typeof setTimeout> | undefined;

  const send = () => {
    if (target && clicks.length >= opts.clicks) {
      const last = clicks[clicks.length - 1]!;
      emit({
        type: "rage_click",
        selector: getSelector(target),
        label: getLabel(target),
        x: Math.round(last.x),
        y: Math.round(last.y),
        count: clicks.length,
        page,
      });
    }
    clicks = [];
    target = null;
  };

  const onClick = (e: MouseEvent) => {
    const el = e.target as Element | null;
    if (!el || (opts.ignore && el.closest(opts.ignore))) return;

    const now = Date.now();
    const x = e.clientX + window.scrollX;
    const y = e.clientY + window.scrollY;
    const first = clicks[0];
    const near = first && Math.hypot(first.x - x, first.y - y) <= RADIUS;
    const recent = clicks.length > 0 && now - clicks[clicks.length - 1]!.t <= opts.window;

    if (!near || !recent) {
      send();
      target = el;
      page = location.pathname;
    }
    clicks.push({ x, y, t: now });

    // 마지막 클릭 뒤로 창이 지나면 연타가 끝난 것으로 보고 보낸다
    clearTimeout(timer);
    timer = setTimeout(send, opts.window);
  };

  document.addEventListener("click", onClick, true);
  return {
    stop() {
      document.removeEventListener("click", onClick, true);
      clearTimeout(timer);
    },
    flush: send,
  };
}
