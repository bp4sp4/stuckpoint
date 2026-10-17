"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { StuckType } from "stuckpoint";
import type { Stats } from "@/lib/aggregate";
import { TYPE_INFO } from "@/lib/labels";
import s from "./dashboard.module.css";

const FRAME_W = 1200;

interface Bubble {
  key: string;
  type: StuckType;
  label: string;
  sessions: number;
  x: number;
  y: number;
}

/**
 * 실제 페이지(같은 도메인의 /demo)를 iframe으로 띄우고,
 * 기록된 선택자로 요소를 다시 찾아 그 위에 막힘 크기만큼 원을 그린다.
 * 좌표가 아니라 요소 기준이라 방문자마다 화면 폭이 달라도 같은 자리에 모인다.
 */
export default function Overlay({ page, stats }: { page: string; stats: Stats }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [scale, setScale] = useState(1);
  const [height, setHeight] = useState(900);
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [missing, setMissing] = useState(0);
  const [loaded, setLoaded] = useState(false);

  // 화면 폭에 맞춰 1200px짜리 페이지를 축소해서 보여준다
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setScale(Math.min(1, el.clientWidth / FRAME_W)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const place = useCallback(() => {
    const doc = frameRef.current?.contentDocument;
    if (!doc || !loaded) return;
    setHeight(doc.documentElement.scrollHeight);

    const targets: { key: string; type: StuckType; label: string; sessions: number; selector: string }[] = [];
    for (const h of stats.hotspots) {
      if (h.page !== page || h.type === "form_abandon") continue;
      targets.push({ key: `${h.type}|${h.selector}`, type: h.type, label: h.label, sessions: h.sessions, selector: h.selector });
    }
    for (const f of stats.forms) {
      if (f.page !== page) continue;
      for (const fl of f.fields) targets.push({ key: `form|${fl.field}`, type: "form_abandon", label: fl.label, sessions: fl.count, selector: fl.field });
    }

    const out: Bubble[] = [];
    let miss = 0;
    // 같은 요소에 여러 종류가 겹치면 조금씩 비켜 그린다
    const seen = new Map<Element, number>();
    for (const t of targets) {
      let el: Element | null = null;
      try {
        el = doc.querySelector(t.selector);
      } catch {
        el = null;
      }
      if (!el) {
        miss++;
        continue;
      }
      const r = el.getBoundingClientRect();
      const n = seen.get(el) ?? 0;
      seen.set(el, n + 1);
      out.push({ ...t, x: r.left + r.width / 2 + n * 22, y: r.top + r.height / 2 + doc.documentElement.scrollTop });
    }
    setBubbles(out);
    setMissing(miss);
  }, [loaded, page, stats]);

  useEffect(() => {
    place();
  }, [place]);

  useEffect(() => setLoaded(false), [page]);

  const max = Math.max(1, ...bubbles.map((b) => b.sessions));

  return (
    <div>
      <div ref={wrapRef} className={s.ov_wrap} style={{ height: height * scale }}>
        <div className={s.ov_stage} style={{ width: FRAME_W, height, transform: `scale(${scale})` }}>
          <iframe
            ref={frameRef}
            key={page}
            src={`${page}?embed=1`}
            title={`${page} 화면`}
            className={s.ov_frame}
            style={{ height }}
            onLoad={() => setLoaded(true)}
            tabIndex={-1}
          />
          <div className={s.ov_layer}>
            {bubbles.map((b) => {
              const size = 28 + (b.sessions / max) * 52;
              return (
                <div
                  key={b.key}
                  className={`${s.bubble} ${s[`bubble_${b.type}`]}`}
                  style={{ left: b.x, top: b.y, width: size, height: size }}
                  title={`${TYPE_INFO[b.type].name} · ${b.label} · ${b.sessions}회 방문`}
                >
                  <span>{b.sessions}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      {missing > 0 && <p className={s.note}>화면에서 찾지 못한 요소 {missing}개는 위 목록에만 표시돼요 (이미 바뀐 화면일 수 있어요).</p>}
    </div>
  );
}
