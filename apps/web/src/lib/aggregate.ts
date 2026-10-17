import type { StuckType } from "stuckpoint";
import type { StoredEvent } from "./validate";

export interface Hotspot {
  type: StuckType;
  page: string;
  selector: string;
  label: string;
  events: number;
  sessions: number;
  /** 분노 클릭이면 평균 연타 횟수 */
  avgCount?: number;
  /** 클릭 후 오류면 가장 많이 난 메시지 */
  message?: string;
  last: number;
}

export interface FormDropoff {
  page: string;
  form: string;
  abandons: number;
  /** 마지막으로 머문 칸별 이탈 수 (많은 순) */
  fields: { label: string; field: string; count: number; avgProgress: number }[];
}

export interface PageStat {
  page: string;
  /** 이 페이지를 연 방문 수 */
  visits: number;
  /** 그중 막힘을 한 번이라도 겪은 방문 수 */
  stuckVisits: number;
  events: number;
}

/** 많이 누른 곳 (trackClicks를 켠 프로젝트만) */
export interface ClickSpot {
  page: string;
  selector: string;
  label: string;
  href?: string;
  clicks: number;
  visitors: number;
  last: number;
}

export interface Stats {
  /** 감지된 막힘 수 (방문 기록 제외) */
  total: number;
  visits: number;
  stuckVisits: number;
  byType: Record<StuckType, number>;
  pages: PageStat[];
  hotspots: Hotspot[];
  forms: FormDropoff[];
  clicks: ClickSpot[];
  recent: (StoredEvent & { type: StuckType })[];
}

const EMPTY: Record<StuckType, number> = { rage_click: 0, dead_click: 0, form_abandon: 0, error_click: 0 };

type Stuck = StoredEvent & { type: StuckType };
const isStuck = (e: StoredEvent): e is Stuck => e.type !== "visit" && e.type !== "click";

/** 이벤트 목록 → 대시보드 숫자. "어디서 · 몇 명이 · 어떻게" 막혔는지로 묶는다 */
export function aggregate(all: StoredEvent[]): Stats {
  const byType = { ...EMPTY };
  const spots = new Map<string, Hotspot & { sids: Set<string>; countSum: number; msgs: Map<string, number> }>();
  const forms = new Map<
    string,
    { page: string; form: string; abandons: number; fields: Map<string, { label: string; field: string; count: number; progress: number }> }
  >();
  const pages = new Map<string, { visits: Set<string>; stuck: Set<string>; events: number }>();
  const clicks = new Map<string, Omit<ClickSpot, "visitors"> & { sids: Set<string> }>();
  const visitSids = new Set<string>();
  const stuckSids = new Set<string>();

  const pageOf = (page: string) => {
    let p = pages.get(page);
    if (!p) {
      p = { visits: new Set(), stuck: new Set(), events: 0 };
      pages.set(page, p);
    }
    return p;
  };

  for (const e of all) {
    if (e.type === "click") {
      // 같은 페이지의 같은 요소끼리 묶는다
      const key = `${e.page}|${e.selector}`;
      const c = clicks.get(key) ?? {
        page: e.page,
        selector: e.selector,
        label: e.label,
        href: e.href,
        clicks: 0,
        last: 0,
        sids: new Set<string>(),
      };
      c.clicks++;
      c.sids.add(e.sid);
      c.last = Math.max(c.last, e.ts);
      clicks.set(key, c);
      continue;
    }
    const p = pageOf(e.page);
    if (!isStuck(e)) {
      p.visits.add(e.sid);
      visitSids.add(e.sid);
      continue;
    }

    byType[e.type]++;
    stuckSids.add(e.sid);
    p.stuck.add(e.sid);
    p.events++;

    const key = `${e.type}|${e.page}|${e.selector}`;
    let s = spots.get(key);
    if (!s) {
      s = {
        type: e.type,
        page: e.page,
        selector: e.selector,
        label: e.label,
        events: 0,
        sessions: 0,
        last: 0,
        sids: new Set(),
        countSum: 0,
        msgs: new Map(),
      };
      spots.set(key, s);
    }
    s.events++;
    s.sids.add(e.sid);
    s.last = Math.max(s.last, e.ts);
    if (e.count) s.countSum += e.count;
    if (e.message) s.msgs.set(e.message, (s.msgs.get(e.message) ?? 0) + 1);

    if (e.type === "form_abandon") {
      const fk = `${e.page}|${e.selector}`;
      let f = forms.get(fk);
      if (!f) {
        f = { page: e.page, form: e.selector, abandons: 0, fields: new Map() };
        forms.set(fk, f);
      }
      f.abandons++;
      const field = e.field ?? e.label;
      const row = f.fields.get(field) ?? { label: e.label, field, count: 0, progress: 0 };
      row.count++;
      row.progress += e.total ? (e.filled ?? 0) / e.total : 0;
      f.fields.set(field, row);
    }
  }

  const hotspots: Hotspot[] = [...spots.values()]
    .map(({ sids, countSum, msgs, ...h }) => ({
      ...h,
      sessions: sids.size,
      avgCount: h.type === "rage_click" && h.events ? Math.round((countSum / h.events) * 10) / 10 : undefined,
      message: [...msgs.entries()].sort((a, b) => b[1] - a[1])[0]?.[0],
    }))
    // 여러 사람이 겪은 문제를 위로: 방문 수 → 이벤트 수
    .sort((a, b) => b.sessions - a.sessions || b.events - a.events);

  const stuck = all.filter(isStuck);

  return {
    total: stuck.length,
    // 방문 기록이 없는 오래된 데이터도 있으니 막힘을 겪은 방문은 방문으로도 센다
    visits: new Set([...visitSids, ...stuckSids]).size,
    stuckVisits: stuckSids.size,
    byType,
    pages: [...pages.entries()]
      .map(([page, p]) => ({ page, visits: new Set([...p.visits, ...p.stuck]).size, stuckVisits: p.stuck.size, events: p.events }))
      .sort((a, b) => b.visits - a.visits),
    hotspots,
    forms: [...forms.values()]
      .map((f) => ({
        page: f.page,
        form: f.form,
        abandons: f.abandons,
        fields: [...f.fields.values()]
          .map((r) => ({ label: r.label, field: r.field, count: r.count, avgProgress: r.count ? r.progress / r.count : 0 }))
          .sort((a, b) => b.count - a.count),
      }))
      .sort((a, b) => b.abandons - a.abandons),
    clicks: [...clicks.values()]
      .map(({ sids, ...c }) => ({ ...c, visitors: sids.size }))
      .sort((a, b) => b.visitors - a.visitors || b.clicks - a.clicks),
    recent: stuck.slice(0, 20),
  };
}
