import Link from "next/link";
import { TYPE_INFO, TYPES } from "@/lib/labels";
import s from "./home.module.css";

const GITHUB = "https://github.com/bp4sp4/stuckpoint";

const EXAMPLES: Record<string, string> = {
  rage_click: "결제 버튼이 3초 동안 아무 표시 없이 기다리게 하면, 사용자는 4~5번 연달아 누릅니다.",
  dead_click: "손가락 커서가 뜨는 상품 사진을 눌렀는데 아무것도 열리지 않습니다.",
  form_abandon: "연락처에 하이픈을 넣었더니 이유 없이 결제가 안 돼서, 고치다가 떠납니다.",
  error_click: "포인트 사용을 눌렀는데 응답 모양이 바뀌어 오류가 나고, 화면은 그대로입니다.",
};

export default function Home() {
  return (
    <div className={s.page}>
      <header className={s.nav}>
        <div className={s.nav_in}>
          <span className={s.brand}>Stuckpoint</span>
          <nav>
            <Link href="/demo">데모</Link>
            <Link href="/dashboard">대시보드</Link>
            <a href={GITHUB} target="_blank" rel="noopener noreferrer">
              GitHub ↗
            </a>
          </nav>
        </div>
      </header>

      <main>
        <section className={s.hero}>
          <p className={s.eyebrow}>오픈소스 · 3KB (gzip)</p>
          <h1>
            사용자가 막히는 순간을
            <br />
            스크립트 한 줄로 잡아냅니다
          </h1>
          <p className={s.lead}>
            분석 도구는 &ldquo;몇 명이 이탈했는지&rdquo;는 알려주지만 &ldquo;어디서 막혔는지&rdquo;는 잘 알려주지 않습니다.
            <br />
            Stuckpoint는 사용자의 답답함이 행동으로 드러나는 네 가지 순간을 감지해 정확한 버튼과 입력칸을 짚어줍니다.
          </p>
          <div className={s.links}>
            <Link href="/demo" className={s.primary}>
              불편한 결제 화면 체험하기 →
            </Link>
            <Link href="/dashboard">실시간 대시보드 보기</Link>
          </div>
        </section>

        <section className={s.section}>
          <h2>네 가지 막힘을 감지합니다</h2>
          <div className={s.types}>
            {TYPES.map((t) => (
              <article key={t} className={s.type}>
                <span className={s.type_name}>
                  <i className={`dot dot-${t}`} /> {TYPE_INFO[t].name}
                </span>
                <b>{TYPE_INFO[t].desc}</b>
                <p>{EXAMPLES[t]}</p>
              </article>
            ))}
          </div>
        </section>

        <section className={s.section}>
          <h2>설치</h2>
          <div className={s.install}>
            <div>
              <p className={s.install_label}>script 태그 한 줄</p>
              <pre>
                <code>{`<script
  src="https://stuckpoint.vercel.app/stuckpoint.global.js"
  data-key="my-site"
  defer
></script>`}</code>
              </pre>
            </div>
            <div>
              <p className={s.install_label}>npm (React · Next.js 등)</p>
              <pre>
                <code>{`import { init } from "stuckpoint";

init({
  endpoint: "https://stuckpoint.vercel.app/api/collect",
  projectKey: "my-site",
});`}</code>
              </pre>
            </div>
          </div>
        </section>

        <section className={s.section}>
          <h2>개인정보는 담지 않습니다</h2>
          <ul className={s.privacy}>
            <li>
              <b>입력값을 읽지 않습니다.</b> 폼 이탈은 &ldquo;어느 칸까지 왔는지&rdquo;만 남기고, 입력창은 이름(name)으로만 기록합니다.
            </li>
            <li>
              <b>쿠키를 쓰지 않습니다.</b> 방문을 묶는 무작위 id는 sessionStorage에만 두고, 탭을 닫으면 사라집니다.
            </li>
            <li>
              <b>가릴 영역을 지정할 수 있습니다.</b> <code>data-stuckpoint-mask</code>를 단 영역은 글자 대신 태그 이름만 남습니다.
            </li>
          </ul>
        </section>
      </main>

      <footer className={s.foot}>
        <span>Stuckpoint · MIT License</span>
        <a href="https://webs-portfolio.vercel.app" target="_blank" rel="noopener noreferrer">
          만든 사람 박상훈 ↗
        </a>
      </footer>
    </div>
  );
}
