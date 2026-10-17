const MAX_DEPTH = 5;

/** 자동 생성처럼 보이는 id (숫자가 길게 붙었거나 콜론이 섞인 React useId 등)는 쓰지 않는다 */
function stableId(id: string): boolean {
  return /^[A-Za-z][\w-]*$/.test(id) && !/\d{3,}/.test(id);
}

/**
 * 요소를 다시 찾을 수 있는 짧은 CSS 선택자를 만든다.
 * CSS Modules 같은 해시 클래스는 배포마다 바뀌므로 쓰지 않고,
 * data-testid → 안정적인 id → 태그:nth-of-type 순서로 고른다.
 */
export function getSelector(el: Element): string {
  const parts: string[] = [];
  let node: Element | null = el;

  while (node && node.nodeType === 1 && parts.length < MAX_DEPTH) {
    const tag = node.tagName.toLowerCase();
    if (tag === "html" || tag === "body") break;

    const testId = node.getAttribute("data-testid");
    if (testId) {
      parts.unshift(`[data-testid="${testId}"]`);
      break;
    }
    if (node.id && stableId(node.id)) {
      parts.unshift(`#${node.id}`);
      break;
    }

    let part = tag;
    const parent: Element | null = node.parentElement;
    if (parent) {
      const same = Array.from(parent.children).filter((c) => c.tagName === node!.tagName);
      if (same.length > 1) part += `:nth-of-type(${same.indexOf(node) + 1})`;
    }
    parts.unshift(part);
    node = parent;
  }

  return parts.join(" > ") || el.tagName.toLowerCase();
}

const LABEL_MAX = 40;

/**
 * 사람이 읽을 이름. 버튼 · 링크의 글자나 aria-label만 쓰고,
 * 입력창 값이나 일반 문단 글자는 개인정보가 섞일 수 있어 담지 않는다.
 */
export function getLabel(el: Element): string {
  if (el.closest("[data-stuckpoint-mask]")) return `<${el.tagName.toLowerCase()}>`;

  const aria = el.getAttribute("aria-label") || el.getAttribute("title") || el.getAttribute("alt");
  if (aria) return aria.trim().slice(0, LABEL_MAX);

  const tag = el.tagName.toLowerCase();
  if (tag === "input" || tag === "textarea" || tag === "select") {
    const name = el.getAttribute("name") || el.getAttribute("placeholder") || el.getAttribute("type") || tag;
    return `${tag}[${name}]`.slice(0, LABEL_MAX);
  }

  const clickable = el.closest("a, button, [role=button], [role=link], summary, label");
  if (clickable) {
    const text = (clickable.textContent || "").replace(/\s+/g, " ").trim();
    if (text) return text.slice(0, LABEL_MAX);
  }
  return `<${tag}>`;
}

/** 눌릴 것처럼 생긴 요소인지 (반응 없는 클릭 판정에 사용) */
export function looksClickable(el: Element): Element | null {
  const hit = el.closest("a[href], button, [role=button], [role=link], [role=tab], summary, [onclick], [tabindex]:not([tabindex='-1'])");
  if (hit) return hit;

  // 커서가 손가락 모양이면 사용자는 눌릴 거라고 기대한다.
  // cursor는 자식에게 상속되므로, 손가락 모양이 시작되는 가장 바깥 요소를 고른다 (안쪽 아이콘 · 글자 말고)
  if (typeof getComputedStyle !== "function" || getComputedStyle(el).cursor !== "pointer") return null;
  let node: Element = el;
  for (let i = 0; i < 6; i++) {
    const parent = node.parentElement;
    if (!parent || parent === document.body || getComputedStyle(parent).cursor !== "pointer") break;
    node = parent;
  }
  return node;
}

/** 직접 입력하는 요소 (누르면 포커스만 이동해서 반응 없는 클릭으로 오인하기 쉬움) */
export function isEditable(el: Element): boolean {
  return !!el.closest("input, textarea, select, [contenteditable=''], [contenteditable=true], label");
}
