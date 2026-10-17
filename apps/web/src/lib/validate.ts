import type { StuckEvent, StuckType } from "stuckpoint";

/** 막힘 · 방문 · 클릭을 같은 모양으로 저장한다 (방문은 selector · label이 빈 값, href는 클릭한 링크의 이동 주소) */
export type EventType = StuckType | "visit" | "click";
export type StoredEvent = Omit<StuckEvent, "type"> & { type: EventType; projectKey: string; href?: string };

const TYPES: EventType[] = ["rage_click", "dead_click", "form_abandon", "error_click", "visit", "click"];
const MAX_EVENTS = 50;

const str = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");
const int = (v: unknown, min = 0, max = 1_000_000) =>
  typeof v === "number" && Number.isFinite(v) ? Math.min(max, Math.max(min, Math.round(v))) : undefined;

/** 누구나 대시보드를 볼 수 있는 프로젝트 (나머지는 DASHBOARD_TOKEN이 있어야 볼 수 있다) */
export function publicKeys(): string[] {
  return (process.env.PUBLIC_KEYS || "demo")
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);
}

/** 이 프로젝트의 통계를 볼 수 있는지 */
export function canView(key: string, token: string | null | undefined): boolean {
  if (publicKeys().includes(key)) return true;
  const secret = process.env.DASHBOARD_TOKEN;
  return !!secret && token === secret;
}

export function allowedKeys(): string[] {
  return (process.env.ALLOWED_KEYS || "demo,portfolio")
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);
}

/**
 * 공개 수집 주소라 무엇이든 들어올 수 있다 → 형식을 엄격하게 거르고 길이를 자른다.
 * 통과하지 못한 이벤트는 조용히 버린다 (SDK가 재전송을 반복하지 않게 응답은 항상 성공).
 */
export function parseBatch(raw: string): StoredEvent[] {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!data || typeof data !== "object") return [];
  const { key, events } = data as { key?: unknown; events?: unknown };
  if (typeof key !== "string" || !allowedKeys().includes(key) || !Array.isArray(events)) return [];

  const now = Date.now();
  const out: StoredEvent[] = [];
  for (const e of events.slice(0, MAX_EVENTS)) {
    if (!e || typeof e !== "object") continue;
    const ev = e as Record<string, unknown>;
    const type = ev.type as EventType;
    if (!TYPES.includes(type)) continue;
    const selector = str(ev.selector, 300);
    const sid = str(ev.sid, 32);
    if (!sid || (type !== "visit" && !selector)) continue;
    const ts = int(ev.ts, 0, Number.MAX_SAFE_INTEGER);

    out.push({
      projectKey: key,
      type,
      page: str(ev.page, 200) || "/",
      selector,
      label: str(ev.label, 60),
      x: int(ev.x) ?? 0,
      y: int(ev.y, 0, 100_000) ?? 0,
      vw: int(ev.vw, 0, 10_000) ?? 0,
      count: int(ev.count, 0, 1000),
      field: str(ev.field, 300) || undefined,
      filled: int(ev.filled, 0, 500),
      total: int(ev.total, 0, 500),
      message: str(ev.message, 120) || undefined,
      href: str(ev.href, 300) || undefined,
      sid,
      // 시계가 틀린 기기도 있으므로 미래 시각은 서버 시각으로 바꾼다
      ts: ts && ts <= now + 60_000 ? ts : now,
    });
  }
  return out;
}
