import { getLabel, getSelector } from "../selector";
import type { Detector, Emit } from "../types";

const WINDOW = 1000;

/**
 * 클릭 후 오류: 누르고 1초 안에 잡히지 않은 오류(error · unhandledrejection)가 남.
 * 사용자는 "버튼이 고장났다"고 느끼지만 화면에는 아무것도 안 보이는 경우.
 */
export function errorDetector(emit: Emit, opts: { ignore?: string }): Detector {
  let last: { el: Element; x: number; y: number; t: number; page: string } | null = null;

  const onClick = (e: MouseEvent) => {
    const el = e.target as Element | null;
    if (!el || (opts.ignore && el.closest(opts.ignore))) return;
    last = { el, x: Math.round(e.clientX + window.scrollX), y: Math.round(e.clientY + window.scrollY), t: Date.now(), page: location.pathname };
  };

  const report = (message: string) => {
    if (!last || Date.now() - last.t > WINDOW) return;
    const { el, x, y, page } = last;
    last = null; // 한 번의 클릭에서 오류가 여러 번 나도 하나로
    emit({ type: "error_click", selector: getSelector(el), label: getLabel(el), x, y, message: message.slice(0, 120), page });
  };

  const onError = (e: ErrorEvent) => report(e.message || "Error");
  const onRejection = (e: PromiseRejectionEvent) => {
    const r = e.reason as { message?: string } | string | undefined;
    report(typeof r === "string" ? r : r?.message || "Unhandled rejection");
  };

  document.addEventListener("click", onClick, true);
  window.addEventListener("error", onError);
  window.addEventListener("unhandledrejection", onRejection);
  return {
    stop() {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    },
  };
}
