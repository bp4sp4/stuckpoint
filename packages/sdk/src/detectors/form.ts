import { getLabel, getSelector } from "../selector";
import type { Detector, Emit } from "../types";

const FIELDS = "input:not([type=hidden]):not([type=submit]):not([type=button]), textarea, select";

interface FormState {
  touched: Set<Element>;
  last: Element | null;
  submitted: boolean;
  reported: boolean;
  page: string;
}

/**
 * 폼 이탈: 폼에 한 칸이라도 입력했는데 제출하지 않고 페이지를 떠나거나 폼이 사라짐.
 * 값은 읽지 않고 "어느 칸까지 왔는지"만 남긴다 → 어떤 칸에서 포기하는지가 보인다.
 */
export function formDetector(emit: Emit, opts: { ignore?: string }): Detector {
  const forms = new Map<HTMLFormElement, FormState>();

  const stateOf = (field: Element): FormState | null => {
    const form = field.closest("form");
    if (!form || (opts.ignore && form.closest(opts.ignore))) return null;
    let s = forms.get(form);
    if (!s) {
      s = { touched: new Set(), last: null, submitted: false, reported: false, page: location.pathname };
      forms.set(form, s);
    }
    return s;
  };

  const onInput = (e: Event) => {
    const el = e.target as Element | null;
    if (!el?.matches?.(FIELDS)) return;
    const s = stateOf(el);
    if (!s) return;
    s.touched.add(el);
    s.last = el;
    // 제출한 뒤에 다시 고치고 있다면 제출이 막힌 것 → 이대로 떠나면 이탈로 센다
    s.submitted = false;
  };

  const onFocus = (e: FocusEvent) => {
    const el = e.target as Element | null;
    if (!el?.matches?.(FIELDS)) return;
    const s = stateOf(el);
    if (s && s.touched.size > 0) s.last = el;
  };

  const onSubmit = (e: Event) => {
    const s = forms.get(e.target as HTMLFormElement);
    if (s) s.submitted = true;
  };

  const report = (form: HTMLFormElement, s: FormState) => {
    if (s.submitted || s.reported || s.touched.size === 0 || !s.last) return;
    const rect = s.last.getBoundingClientRect();
    emit({
      type: "form_abandon",
      selector: getSelector(form),
      label: getLabel(s.last),
      field: getSelector(s.last),
      filled: s.touched.size,
      total: form.querySelectorAll(FIELDS).length,
      x: Math.round(rect.left + rect.width / 2 + window.scrollX),
      y: Math.round(rect.top + rect.height / 2 + window.scrollY),
      page: s.page,
    });
    s.reported = true; // 같은 폼을 두 번 보내지 않는다
  };

  const flush = () => forms.forEach((s, form) => report(form, s));

  // SPA에서 화면이 바뀌어 폼이 DOM에서 빠지는 경우도 이탈로 본다
  const observer = new MutationObserver(() => {
    forms.forEach((s, form) => {
      if (!form.isConnected) {
        report(form, s);
        forms.delete(form);
      }
    });
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });

  document.addEventListener("input", onInput, true);
  document.addEventListener("change", onInput, true);
  document.addEventListener("focusin", onFocus, true);
  document.addEventListener("submit", onSubmit, true);
  return {
    stop() {
      document.removeEventListener("input", onInput, true);
      document.removeEventListener("change", onInput, true);
      document.removeEventListener("focusin", onFocus, true);
      document.removeEventListener("submit", onSubmit, true);
      observer.disconnect();
    },
    flush,
  };
}
