import type { StuckType } from "stuckpoint";

export const TYPE_INFO: Record<StuckType, { name: string; desc: string }> = {
  rage_click: { name: "분노 클릭", desc: "같은 자리를 짧은 시간에 여러 번 누름" },
  dead_click: { name: "반응 없는 클릭", desc: "눌릴 것 같은데 눌러도 아무 일도 없음" },
  form_abandon: { name: "폼 이탈", desc: "쓰다가 제출하지 않고 떠남" },
  error_click: { name: "클릭 후 오류", desc: "누른 직후 자바스크립트 오류가 남" },
};

export const TYPES = Object.keys(TYPE_INFO) as StuckType[];
