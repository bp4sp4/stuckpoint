"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { init, type StuckEvent } from "stuckpoint";
import { TYPE_INFO } from "@/lib/labels";
import s from "./demo.module.css";

const PRICE = 39000;
const won = (n: number) => `${n.toLocaleString("ko-KR")}원`;

interface Toast {
  id: number;
  event: StuckEvent;
}

/**
 * 일부러 불편하게 만든 결제 화면 (fixed=false) 과 그 문제를 고친 화면 (fixed=true).
 * 같은 요소에는 같은 data-testid를 달아 두 버전의 막힘을 나란히 비교할 수 있게 한다.
 *
 * 고장 목록
 * 1. 상품 사진: 손가락 커서인데 눌러도 아무것도 안 열림 → 반응 없는 클릭
 * 2. 쿠폰 적용: 눌러도 아무 반응이 없음 → 반응 없는 클릭
 * 3. 포인트 사용: 응답에 balance가 없어 오류가 나고 화면은 그대로 → 클릭 후 오류
 * 4. 결제하기: 3초 동안 아무 표시 없이 기다림 → 분노 클릭
 * 5. 연락처: 하이픈을 넣으면 이유 없이 결제가 안 됨 → 폼 이탈
 */
export default function Checkout({ fixed = false, embed = false }: { fixed?: boolean; embed?: boolean }) {
  const [qty, setQty] = useState(1);
  const [coupon, setCoupon] = useState("");
  const [discount, setDiscount] = useState(0);
  const [couponMsg, setCouponMsg] = useState("");
  const [points, setPoints] = useState<number | null>(null);
  const [zoom, setZoom] = useState(false);
  const [phone, setPhone] = useState("");
  const [paying, setPaying] = useState(false);
  const [done, setDone] = useState(false);
  const [formMsg, setFormMsg] = useState("");
  const [toasts, setToasts] = useState<Toast[]>([]);
  const seq = useRef(0);

  // SDK 설치: 감지된 막힘은 서버로 보내고, 체험하는 사람에게는 토스트로 바로 보여준다
  useEffect(() => {
    if (embed) return;
    const sp = init({
      endpoint: "/api/collect",
      projectKey: "demo",
      onEvent: (event) => {
        const id = ++seq.current;
        setToasts((t) => [...t.slice(-2), { id, event }]);
        setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
      },
    });
    return () => sp.destroy();
  }, [embed]);

  const total = Math.max(0, PRICE * qty - discount - (points ?? 0));

  const applyCoupon = () => {
    if (!fixed) return; // 고장: 아무 일도 하지 않는다
    if (coupon.trim().toUpperCase() === "WELCOME") {
      setDiscount(3000);
      setCouponMsg("쿠폰이 적용됐어요. 3,000원 할인");
    } else {
      setCouponMsg(coupon ? "사용할 수 없는 쿠폰이에요. WELCOME을 입력해 보세요" : "쿠폰 코드를 입력해 주세요");
    }
  };

  const usePoints = () => {
    // 서버 응답을 흉내낸다. 고장 버전은 응답 모양이 바뀐 걸 모르고 balance를 바로 읽는다
    const res = new Promise<{ data?: { balance: number } }>((r) => setTimeout(() => r(fixed ? { data: { balance: 1200 } } : {}), 150));
    if (fixed) {
      res.then((d) => setPoints(d.data?.balance ?? 0));
    } else {
      res.then((d) => {
        const balance = (d as unknown as { data: { balance: number } }).data.balance; // TypeError
        setPoints(balance);
      });
    }
  };

  const pay = (e: React.FormEvent) => {
    e.preventDefault();
    if (paying) return;
    const digits = phone.replace(/\D/g, "");
    if (fixed) {
      if (digits.length < 10) {
        setFormMsg("연락처를 숫자 10~11자리로 입력해 주세요");
        return;
      }
      setFormMsg("");
      setPaying(true);
      setTimeout(() => {
        setPaying(false);
        setDone(true);
      }, 1200);
      return;
    }
    // 고장: 아무 표시 없이 3초 기다린 뒤, 하이픈이 있으면 말없이 실패한다
    setTimeout(() => {
      if (/^\d{10,11}$/.test(phone)) setDone(true);
    }, 3000);
  };

  return (
    <div className={`${s.page} ${embed ? s.embed : ""}`}>
      {!embed && (
        <div className={s.banner}>
          <div className={s.banner_in}>
            <p>
              {fixed ? (
                <>
                  <b>고친 버전이에요.</b> 같은 동작을 해 보고 막힘이 줄었는지 확인해 보세요.
                </>
              ) : (
                <>
                  <b>일부러 불편하게 만든 결제 화면이에요.</b> 평소처럼 써 보세요. 막히는 순간이 오른쪽 아래에 바로 떠요.
                </>
              )}
            </p>
            <nav>
              <Link href={fixed ? "/demo" : "/demo/fixed"}>{fixed ? "고장난 버전" : "고친 버전"}</Link>
              <Link href="/dashboard" className={s.banner_strong}>
                대시보드 보기 →
              </Link>
            </nav>
          </div>
        </div>
      )}

      <main className={s.shop}>
        <header className={s.shop_head}>
          <span className={s.logo}>모모 스토어</span>
          <span className={s.step}>장바구니 › <b>주문 · 결제</b></span>
        </header>

        <div className={s.grid}>
          <div className={s.col}>
            <section className={s.card}>
              <h2>주문 상품</h2>
              <div className={s.product}>
                <div
                  data-testid="product-image"
                  className={s.thumb}
                  onClick={fixed ? () => setZoom(true) : undefined}
                  role={fixed ? "button" : undefined}
                  aria-label="상품 사진 크게 보기"
                >
                  <span>🎧</span>
                </div>
                <div className={s.product_info}>
                  <b>모모 무선 헤드폰 Lite</b>
                  <span>샌드 베이지 · 무료배송</span>
                  <div className={s.qty}>
                    <button type="button" data-testid="qty-minus" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="수량 빼기">
                      −
                    </button>
                    <span>{qty}</span>
                    <button type="button" data-testid="qty-plus" onClick={() => setQty((q) => Math.min(9, q + 1))} aria-label="수량 더하기">
                      +
                    </button>
                  </div>
                </div>
                <b className={s.price}>{won(PRICE * qty)}</b>
              </div>
            </section>

            <section className={s.card}>
              <h2>할인</h2>
              <div className={s.row}>
                <input
                  className={s.input}
                  placeholder="쿠폰 코드 (WELCOME)"
                  value={coupon}
                  onChange={(e) => setCoupon(e.target.value)}
                  name="coupon"
                />
                <button type="button" data-testid="coupon-apply" className={s.ghost} onClick={applyCoupon} aria-label="쿠폰 적용">
                  적용
                </button>
              </div>
              {couponMsg && <p className={s.hint}>{couponMsg}</p>}
              <div className={s.row_between}>
                <span>보유 포인트 {points === null ? "" : won(points)}</span>
                <button type="button" data-testid="points-use" className={s.link_btn} onClick={usePoints}>
                  {points === null ? "포인트 사용" : "사용 중"}
                </button>
              </div>
            </section>

            <form id="shipping" className={s.card} onSubmit={pay} noValidate>
              <h2>배송 정보</h2>
              <label className={s.field}>
                <span>받는 분</span>
                <input className={s.input} name="name" autoComplete="off" />
              </label>
              <label className={s.field}>
                <span>연락처</span>
                <input
                  className={s.input}
                  name="phone"
                  inputMode="numeric"
                  placeholder={fixed ? "숫자만 입력 (예: 01012345678)" : "010-0000-0000"}
                  value={phone}
                  onChange={(e) => setPhone(fixed ? e.target.value.replace(/\D/g, "").slice(0, 11) : e.target.value)}
                  autoComplete="off"
                />
              </label>
              <label className={s.field}>
                <span>주소</span>
                <input className={s.input} name="address" autoComplete="off" />
              </label>
              <label className={s.field}>
                <span>배송 요청사항</span>
                <input className={s.input} name="memo" autoComplete="off" />
              </label>
              {formMsg && <p className={s.error}>{formMsg}</p>}
            </form>
          </div>

          <aside className={s.summary}>
            <div className={s.card}>
              <h2>결제 금액</h2>
              <dl>
                <div>
                  <dt>상품 금액</dt>
                  <dd>{won(PRICE * qty)}</dd>
                </div>
                <div>
                  <dt>쿠폰 할인</dt>
                  <dd>−{won(discount)}</dd>
                </div>
                <div>
                  <dt>포인트</dt>
                  <dd>−{won(points ?? 0)}</dd>
                </div>
                <div className={s.total}>
                  <dt>최종 결제 금액</dt>
                  <dd>{won(total)}</dd>
                </div>
              </dl>
              <button type="submit" form="shipping" data-testid="pay" className={s.pay} disabled={paying || done}>
                {done ? "결제 완료 (데모)" : paying ? "결제하는 중…" : `${won(total)} 결제하기`}
              </button>
              {done && <p className={s.hint}>데모라 실제 결제는 되지 않아요.</p>}
            </div>
          </aside>
        </div>
      </main>

      {zoom && (
        <div className={s.zoom} onClick={() => setZoom(false)} role="dialog" aria-label="상품 사진">
          <span>🎧</span>
          <p>눌러서 닫기</p>
        </div>
      )}

      {!embed && (
        <div className={s.toasts} aria-live="polite" data-stuckpoint-ignore>
          {toasts.map(({ id, event }) => (
            <div key={id} className={s.toast}>
              <i className={`dot dot-${event.type}`} />
              <div>
                <b>{TYPE_INFO[event.type].name} 감지</b>
                <span>
                  {event.label}
                  {event.count ? ` · ${event.count}번 연타` : ""}
                  {event.message ? ` · ${event.message}` : ""}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
