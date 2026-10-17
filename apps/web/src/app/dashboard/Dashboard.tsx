"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Stats } from "@/lib/aggregate";
import { TYPE_INFO, TYPES } from "@/lib/labels";
import Overlay from "./Overlay";
import s from "./dashboard.module.css";

const RANGES = [
  { id: "1h", label: "1시간" },
  { id: "24h", label: "24시간" },
  { id: "7d", label: "7일" },
];

const DEMO_PAGES = ["/demo", "/demo/fixed"];

function ago(ts: number) {
  const sec = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (sec < 60) return `${sec}초 전`;
  if (sec < 3600) return `${Math.round(sec / 60)}분 전`;
  if (sec < 86400) return `${Math.round(sec / 3600)}시간 전`;
  return `${Math.round(sec / 86400)}일 전`;
}

export default function Dashboard() {
  const [range, setRange] = useState("24h");
  const [stats, setStats] = useState<Stats | null>(null);
  const [failed, setFailed] = useState(false);
  const [page, setPage] = useState("/demo");

  // 3초마다 새로 받아온다 → 다른 탭에서 데모를 만지면 여기 숫자가 바로 오른다
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch(`/api/stats?key=demo&range=${range}`, { cache: "no-store" });
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as Stats;
        if (alive) {
          setStats(data);
          setFailed(false);
        }
      } catch {
        if (alive) setFailed(true);
      }
    };
    load();
    const t = setInterval(load, 3000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [range]);

  const empty = stats && stats.total === 0;
  const broken = stats?.pages.find((p) => p.page === "/demo");
  const fixed = stats?.pages.find((p) => p.page === "/demo/fixed");
  const rate = (p?: { visits: number; stuckVisits: number }) => (p && p.visits ? `${Math.round((p.stuckVisits / p.visits) * 100)}%` : "–");

  return (
    <div className={s.page}>
      <header className={s.head}>
        <div className={s.head_in}>
          <Link href="/" className={s.brand}>
            Stuckpoint
          </Link>
          <span className={s.project}>demo 프로젝트</span>
          <span className={s.live}>
            <i /> 3초마다 갱신
          </span>
          <div className={s.tabs} role="tablist">
            {RANGES.map((r) => (
              <button key={r.id} role="tab" aria-selected={range === r.id} className={range === r.id ? s.tab_on : s.tab} onClick={() => setRange(r.id)}>
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className={s.main}>
        {failed && !stats && <p className={s.note}>통계를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.</p>}

        {/* 요약 */}
        <section className={s.kpis}>
          <div className={s.kpi_main}>
            <span>감지된 막힘</span>
            <b>{stats?.total ?? "–"}</b>
            <em>{stats ? `방문 ${stats.visits}번 중 ${stats.stuckVisits}번(${rate(stats)})이 막혔어요` : "불러오는 중"}</em>
          </div>
          {TYPES.map((t) => (
            <div key={t} className={s.kpi}>
              <span>
                <i className={`dot dot-${t}`} /> {TYPE_INFO[t].name}
              </span>
              <b>{stats?.byType[t] ?? "–"}</b>
              <em>{TYPE_INFO[t].desc}</em>
            </div>
          ))}
        </section>

        {empty && (
          <section className={s.empty}>
            <p>아직 이 기간에 기록이 없어요.</p>
            <Link href="/demo">불편한 결제 화면에서 막혀 보기 →</Link>
          </section>
        )}

        {stats && !empty && (
          <>
            {/* 가장 많이 막힌 곳 */}
            <section className={s.section}>
              <div className={s.section_head}>
                <h2>가장 많이 막힌 곳</h2>
                <p>여러 방문자가 겪은 순서대로 정렬했어요.</p>
              </div>
              <ol className={s.spots}>
                {stats.hotspots.slice(0, 8).map((h) => (
                  <li key={`${h.type}|${h.page}|${h.selector}`} className={s.spot}>
                    <div className={s.spot_main}>
                      <span className={s.spot_type}>
                        <i className={`dot dot-${h.type}`} /> {TYPE_INFO[h.type].name}
                      </span>
                      <b>{h.label}</b>
                      <code>
                        {h.page} · {h.selector}
                      </code>
                      {h.message && <span className={s.spot_msg}>{h.message}</span>}
                    </div>
                    <div className={s.spot_num}>
                      <b>{h.sessions}</b>
                      <span>방문</span>
                      <em>
                        {h.events}회{h.avgCount ? ` · 평균 ${h.avgCount}번 연타` : ""} · {ago(h.last)}
                      </em>
                    </div>
                  </li>
                ))}
              </ol>
            </section>

            {/* 화면 위에서 보기 */}
            <section className={s.section}>
              <div className={s.section_head}>
                <h2>화면 위에서 보기</h2>
                <div className={s.tabs}>
                  {DEMO_PAGES.map((p) => (
                    <button key={p} className={page === p ? s.tab_on : s.tab} onClick={() => setPage(p)}>
                      {p === "/demo" ? "고장난 버전" : "고친 버전"}
                    </button>
                  ))}
                </div>
              </div>
              <div className={s.legend}>
                {TYPES.map((t) => (
                  <span key={t}>
                    <i className={`dot dot-${t}`} /> {TYPE_INFO[t].name}
                  </span>
                ))}
                <span>원 크기 = 겪은 방문 수</span>
              </div>
              <Overlay page={page} stats={stats} />
            </section>

            <div className={s.two}>
              {/* 폼 이탈 */}
              <section className={s.section}>
                <div className={s.section_head}>
                  <h2>폼 이탈 지점</h2>
                  <p>제출하지 않고 떠날 때 마지막으로 머문 칸이에요.</p>
                </div>
                {stats.forms.length === 0 && <p className={s.note}>아직 폼 이탈이 없어요.</p>}
                {stats.forms.map((f) => (
                  <div key={`${f.page}|${f.form}`} className={s.form}>
                    <p className={s.form_title}>
                      <code>
                        {f.page} · {f.form}
                      </code>
                      <span>{f.abandons}번 이탈</span>
                    </p>
                    {f.fields.map((fl) => (
                      <div key={fl.field} className={s.bar}>
                        <span className={s.bar_label}>{fl.label}</span>
                        <div className={s.bar_track}>
                          <div style={{ width: `${(fl.count / f.abandons) * 100}%` }} />
                        </div>
                        <span className={s.bar_num}>
                          {fl.count} <em>· 평균 {Math.round(fl.avgProgress * 100)}% 작성</em>
                        </span>
                      </div>
                    ))}
                  </div>
                ))}
              </section>

              {/* 고치기 전후 */}
              <section className={s.section}>
                <div className={s.section_head}>
                  <h2>고치기 전 · 후</h2>
                  <p>페이지를 연 방문 중 한 번이라도 막힌 방문의 비율이에요.</p>
                </div>
                <div className={s.compare}>
                  <div>
                    <span>고장난 버전</span>
                    <b>{rate(broken)}</b>
                    <em>{broken ? `방문 ${broken.visits}번 중 ${broken.stuckVisits}번 · 막힘 ${broken.events}건` : "기록 없음"}</em>
                  </div>
                  <div className={s.compare_good}>
                    <span>고친 버전</span>
                    <b>{rate(fixed)}</b>
                    <em>{fixed ? `방문 ${fixed.visits}번 중 ${fixed.stuckVisits}번 · 막힘 ${fixed.events}건` : "기록 없음"}</em>
                  </div>
                </div>
                <Link href="/demo/fixed" className={s.more}>
                  고친 버전 써 보기 →
                </Link>
              </section>
            </div>

            {/* 실시간 기록 */}
            <section className={s.section}>
              <div className={s.section_head}>
                <h2>실시간 기록</h2>
                <p>최근 20건</p>
              </div>
              <ul className={s.feed}>
                {stats.recent.map((e, i) => (
                  <li key={`${e.sid}-${e.ts}-${i}`}>
                    <i className={`dot dot-${e.type}`} />
                    <span className={s.feed_type}>{TYPE_INFO[e.type].name}</span>
                    <b>{e.label}</b>
                    <span className={s.feed_page}>{e.page}</span>
                    <time>{ago(e.ts)}</time>
                  </li>
                ))}
              </ul>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
