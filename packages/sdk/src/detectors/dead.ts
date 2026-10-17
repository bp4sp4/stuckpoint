import { getLabel, getSelector, isEditable, looksClickable } from "../selector";
import type { Detector, Emit } from "../types";

/**
 * 반응 없는 클릭: 눌릴 것처럼 생긴 요소를 눌렀는데 정해진 시간(기본 1000ms) 동안
 * DOM 변화 · 주소 변경 · 새 창 · 포커스 이동이 하나도 없음.
 * 입력창 · 라벨은 포커스만 옮기므로 제외한다.
 */
export function deadDetector(emit: Emit, opts: { delay: number; ignore?: string }): Detector {
  let lastChange = 0;
  const pending = new Set<ReturnType<typeof setTimeout>>();
  const waiting = new WeakSet<Element>();

  const mark = () => {
    lastChange = Date.now();
  };
  // 무시 영역(data-stuckpoint-ignore · ignore 옵션) 안의 변화는 클릭에 대한 반응으로 치지 않는다
  // (시계 · 자동 슬라이드 · 알림 토스트처럼 클릭과 상관없이 바뀌는 곳)
  const skip = opts.ignore ? `[data-stuckpoint-ignore], ${opts.ignore}` : "[data-stuckpoint-ignore]";
  const observer = new MutationObserver((records) => {
    const relevant = records.some((r) => {
      const el = r.target.nodeType === 1 ? (r.target as Element) : r.target.parentElement;
      if (!el || el.closest(skip)) return false;
      // 입력창 자체의 속성 변화는 타이핑 · 자동완성에서 생기는 것이라 클릭에 대한 반응으로 보지 않는다
      if (r.type === "attributes" && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return false;
      return true;
    });
    if (relevant) mark();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, characterData: true });
  window.addEventListener("popstate", mark);
  window.addEventListener("hashchange", mark);
  window.addEventListener("blur", mark); // 새 탭 · 다운로드 · 외부 앱으로 넘어감

  const onClick = (e: MouseEvent) => {
    const raw = e.target as Element | null;
    if (!raw || isEditable(raw) || (opts.ignore && raw.closest(opts.ignore))) return;
    const el = looksClickable(raw);
    // 같은 요소를 연타하면 판정 중인 첫 클릭 하나로만 본다 (연타 자체는 분노 클릭이 잡는다)
    if (!el || waiting.has(el)) return;
    waiting.add(el);

    const clickedAt = Date.now();
    const href = location.href;
    const page = location.pathname;
    const focused = document.activeElement;
    const x = Math.round(e.clientX + window.scrollX);
    const y = Math.round(e.clientY + window.scrollY);

    // 포커스 이동(모달이 열리며 입력창으로 이동 등)은 클릭 직후에만 본다.
    // 끝에서 비교하면 사용자가 다음 칸을 누르거나 타이핑하러 간 것까지 반응으로 오해한다
    let focusMoved = false;
    const focusCheck = setTimeout(() => {
      pending.delete(focusCheck);
      focusMoved = document.activeElement !== focused;
    }, 100);
    pending.add(focusCheck);

    const timer = setTimeout(() => {
      pending.delete(timer);
      waiting.delete(el);
      const changed = lastChange >= clickedAt || location.href !== href || focusMoved;
      if (changed || !el.isConnected) return;
      emit({ type: "dead_click", selector: getSelector(el), label: getLabel(el), x, y, page });
    }, opts.delay);
    pending.add(timer);
  };

  document.addEventListener("click", onClick, true);
  return {
    stop() {
      document.removeEventListener("click", onClick, true);
      observer.disconnect();
      window.removeEventListener("popstate", mark);
      window.removeEventListener("hashchange", mark);
      window.removeEventListener("blur", mark);
      pending.forEach(clearTimeout);
    },
  };
}
