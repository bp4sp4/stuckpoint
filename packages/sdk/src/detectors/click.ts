import { getLabel, getSelector, looksClickable } from "../selector";
import type { ClickEvent, Detector } from "../types";

/** 이동할 주소: 같은 사이트면 경로만, 다른 사이트면 origin + 경로. 쿼리는 개인정보가 섞일 수 있어 뺀다 */
function cleanHref(a: HTMLAnchorElement): string | undefined {
  const raw = a.getAttribute("href");
  if (!raw) return undefined;
  if (raw.startsWith("mailto:") || raw.startsWith("tel:")) return raw.split(":")[0] + ":";
  try {
    const u = new URL(raw, location.href);
    if (u.origin !== location.origin) return u.origin + u.pathname;
    // 같은 페이지 안의 이동(#contact 등)은 해시가 곧 목적지라 남긴다
    return u.pathname === location.pathname && u.hash ? u.pathname + u.hash : u.pathname;
  } catch {
    return undefined;
  }
}

/**
 * 클릭 기록 (trackClicks 옵션): 링크 · 버튼처럼 눌릴 것처럼 생긴 요소를 누르면 하나씩 남긴다.
 * 막힘과 달리 "무엇이 관심을 끌었는지"를 보기 위한 기록이다.
 */
export function clickDetector(push: (e: Omit<ClickEvent, "sid" | "ts" | "vw">) => void, opts: { ignore?: string }): Detector {
  const onClick = (e: MouseEvent) => {
    const raw = e.target as Element | null;
    if (!raw || (opts.ignore && raw.closest(opts.ignore))) return;
    const el = looksClickable(raw);
    if (!el) return;
    const a = el.closest("a");
    push({
      type: "click",
      page: location.pathname,
      selector: getSelector(el),
      label: getLabel(el),
      href: a ? cleanHref(a) : undefined,
      x: Math.round(e.clientX + window.scrollX),
      y: Math.round(e.clientY + window.scrollY),
    });
  };
  document.addEventListener("click", onClick, true);
  return {
    stop() {
      document.removeEventListener("click", onClick, true);
    },
  };
}
