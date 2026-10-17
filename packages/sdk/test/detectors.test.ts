import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { init, type StuckEvent, type StuckpointInstance } from "../src";

let events: StuckEvent[] = [];
let sp: StuckpointInstance;

function start(extra: Partial<Parameters<typeof init>[0]> = {}) {
  sp = init({
    endpoint: "http://localhost/collect",
    projectKey: "test",
    onEvent: (e) => {
      events.push(e);
      return false; // 테스트에서는 보내지 않는다
    },
    ...extra,
  });
}

function click(el: Element, x = 10, y = 10) {
  el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, clientX: x, clientY: y }));
}

/** MutationObserver 콜백(마이크로태스크)까지 흘려보낸다 */
async function settle(ms: number) {
  await Promise.resolve();
  vi.advanceTimersByTime(ms);
  await Promise.resolve();
}

beforeEach(() => {
  events = [];
  sessionStorage.clear();
  document.body.innerHTML = "";
  vi.useFakeTimers();
});

afterEach(() => {
  sp?.destroy();
  vi.useRealTimers();
});

describe("분노 클릭", () => {
  it("같은 자리를 짧게 3번 누르면 한 번만 기록하고 횟수를 남긴다", async () => {
    document.body.innerHTML = `<button id="pay">결제하기</button>`;
    start();
    const btn = document.getElementById("pay")!;
    for (let i = 0; i < 5; i++) {
      click(btn, 100, 100);
      vi.advanceTimersByTime(150);
    }
    await settle(1000);

    const rage = events.filter((e) => e.type === "rage_click");
    expect(rage).toHaveLength(1);
    expect(rage[0]).toMatchObject({ selector: "#pay", label: "결제하기", count: 5 });
  });

  it("천천히 누르거나 멀리 떨어진 곳을 누르면 분노 클릭이 아니다", async () => {
    document.body.innerHTML = `<button id="a">A</button>`;
    start();
    const btn = document.getElementById("a")!;
    click(btn, 0, 0);
    vi.advanceTimersByTime(900);
    click(btn, 0, 0);
    vi.advanceTimersByTime(900);
    click(btn, 0, 0);
    click(btn, 200, 200);
    click(btn, 400, 400);
    await settle(1000);
    expect(events.filter((e) => e.type === "rage_click")).toHaveLength(0);
  });
});

describe("반응 없는 클릭", () => {
  it("버튼을 눌렀는데 화면이 그대로면 기록한다", async () => {
    document.body.innerHTML = `<button id="coupon">쿠폰 적용</button>`;
    start();
    click(document.getElementById("coupon")!);
    await settle(1100);
    expect(events).toEqual([expect.objectContaining({ type: "dead_click", selector: "#coupon", label: "쿠폰 적용" })]);
  });

  it("누른 뒤 DOM이 바뀌면 정상 반응으로 본다", async () => {
    document.body.innerHTML = `<button id="ok">열기</button><div id="out"></div>`;
    start();
    const btn = document.getElementById("ok")!;
    btn.addEventListener("click", () => {
      document.getElementById("out")!.textContent = "열렸어요";
    });
    click(btn);
    await settle(1100);
    expect(events.filter((e) => e.type === "dead_click")).toHaveLength(0);
  });

  it("평범한 글자나 입력창을 누른 것은 세지 않는다", async () => {
    document.body.innerHTML = `<p id="txt">그냥 문단</p><input id="name" />`;
    start();
    click(document.getElementById("txt")!);
    click(document.getElementById("name")!);
    await settle(1100);
    expect(events).toHaveLength(0);
  });

  it("무시 영역의 변화(토스트 · 시계)는 반응으로 치지 않는다", async () => {
    document.body.innerHTML = `<button id="c">쿠폰 적용</button><div data-stuckpoint-ignore id="toast"></div>`;
    start();
    click(document.getElementById("c")!);
    document.getElementById("toast")!.textContent = "알림";
    await settle(1100);
    expect(events).toEqual([expect.objectContaining({ type: "dead_click", label: "쿠폰 적용" })]);
  });

  it("손가락 커서 영역 안쪽(아이콘)을 눌러도 커서가 시작되는 바깥 요소로 기록한다", async () => {
    document.body.innerHTML = `<div id="thumb" style="cursor:pointer" aria-label="상품 사진"><span style="cursor:pointer">🎧</span></div>`;
    start();
    // jsdom은 cursor 상속을 계산하지 않아서, 브라우저처럼 안쪽에도 같은 값을 직접 준다
    click(document.querySelector("#thumb span")!);
    await settle(1100);
    expect(events).toEqual([expect.objectContaining({ type: "dead_click", selector: "#thumb", label: "상품 사진" })]);
  });

  it("누른 직후 포커스가 옮겨지면(모달 입력창 등) 반응으로 보지만, 사용자가 나중에 다른 칸으로 가는 건 반응이 아니다", async () => {
    document.body.innerHTML = `<button id="open">검색</button><button id="dead">쿠폰 적용</button><input id="q" />`;
    start();
    const q = document.getElementById("q") as HTMLInputElement;
    document.getElementById("open")!.addEventListener("click", () => q.focus());
    click(document.getElementById("open")!);
    await settle(1100);
    expect(events).toHaveLength(0);

    click(document.getElementById("dead")!);
    await settle(400);
    q.focus(); // 사용자가 포기하고 다른 칸으로 이동
    await settle(800);
    expect(events).toEqual([expect.objectContaining({ type: "dead_click", label: "쿠폰 적용" })]);
  });

  it("같은 버튼을 연타해도 반응 없는 클릭은 하나만 남긴다", async () => {
    document.body.innerHTML = `<button id="x">X</button>`;
    start();
    const btn = document.getElementById("x")!;
    click(btn);
    click(btn);
    click(btn);
    await settle(1100);
    expect(events.filter((e) => e.type === "dead_click")).toHaveLength(1);
  });
});

describe("클릭 후 오류", () => {
  it("누르고 1초 안에 잡히지 않은 오류가 나면 메시지와 함께 기록한다", async () => {
    document.body.innerHTML = `<button id="save">저장</button>`;
    start();
    click(document.getElementById("save")!);
    window.dispatchEvent(new ErrorEvent("error", { message: "Cannot read properties of undefined" }));
    await settle(10);
    expect(events).toContainEqual(
      expect.objectContaining({ type: "error_click", selector: "#save", message: "Cannot read properties of undefined" })
    );
  });

  it("클릭과 상관없이 한참 뒤에 난 오류는 무시한다", async () => {
    document.body.innerHTML = `<button id="save">저장</button><div id="o"></div>`;
    start();
    click(document.getElementById("save")!);
    await settle(1500);
    window.dispatchEvent(new ErrorEvent("error", { message: "late" }));
    expect(events.filter((e) => e.type === "error_click")).toHaveLength(0);
  });
});

describe("폼 이탈", () => {
  const FORM = `
    <form id="signup">
      <input name="name" />
      <input name="phone" />
      <input name="email" />
      <button type="submit">가입</button>
    </form>`;

  function type(name: string) {
    const el = document.querySelector(`[name=${name}]`)!;
    el.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
    (el as HTMLInputElement).value = "secret-value";
    el.dispatchEvent(new Event("input", { bubbles: true }));
  }

  it("쓰다가 떠나면 마지막 칸과 진행 정도를 남기고 값은 담지 않는다", () => {
    document.body.innerHTML = FORM;
    start();
    type("name");
    type("phone");
    sp.flush();

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ type: "form_abandon", selector: "#signup", label: "input[phone]", filled: 2, total: 3 });
    expect(JSON.stringify(events[0])).not.toContain("secret-value");
  });

  it("제출했으면 이탈이 아니다", () => {
    document.body.innerHTML = FORM;
    start();
    type("name");
    document.getElementById("signup")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    sp.flush();
    expect(events).toHaveLength(0);
  });

  it("제출했는데 다시 고치다가 떠나면 막힌 것으로 보고 이탈로 센다", () => {
    document.body.innerHTML = FORM;
    start();
    type("name");
    document.getElementById("signup")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    type("phone");
    sp.flush();
    expect(events).toEqual([expect.objectContaining({ type: "form_abandon", label: "input[phone]" })]);
  });

  it("폼이 화면에서 사라지면(SPA 이동) 그 자리에서 이탈로 센다", async () => {
    document.body.innerHTML = FORM;
    start();
    type("name");
    document.getElementById("signup")!.remove();
    await settle(0);
    expect(events).toEqual([expect.objectContaining({ type: "form_abandon", filled: 1 })]);
  });

  it("아무것도 안 쓰고 지나가면 기록하지 않는다", () => {
    document.body.innerHTML = FORM;
    start();
    sp.flush();
    expect(events).toHaveLength(0);
  });
});

describe("페이지 · 방문", () => {
  it("감지가 끝나기 전에 주소가 바뀌어도 행동한 페이지로 기록한다", () => {
    history.replaceState(null, "", "/checkout");
    document.body.innerHTML = `<form id="f"><input name="a" /><input name="b" /></form>`;
    start();
    const el = document.querySelector("[name=a]")!;
    el.dispatchEvent(new Event("input", { bubbles: true }));
    history.pushState(null, "", "/done");
    sp.flush();
    expect(events[0]).toMatchObject({ type: "form_abandon", page: "/checkout" });
    history.replaceState(null, "", "/");
  });

  it("경로마다 방문을 한 번씩 보내고, SPA 이동도 센다", async () => {
    const sent: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init: { body: string }) => {
        sent.push(...(JSON.parse(init.body).events as { type: string; page: string }[]).map((e) => `${e.type}:${e.page}`));
        return new Response(null, { status: 204 });
      })
    );
    history.replaceState(null, "", "/a");
    start();
    history.pushState(null, "", "/b");
    history.pushState(null, "", "/a"); // 이미 센 경로
    await settle(150);
    sp.flush();
    expect(sent).toEqual(["visit:/a", "visit:/b"]);
  });

  it("감싸기를 거치지 않은 주소 변경(프레임워크 내부)도 1초 안에 방문으로 센다", async () => {
    const sent: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init: { body: string }) => {
        sent.push(...(JSON.parse(init.body).events as { type: string; page: string }[]).map((e) => `${e.type}:${e.page}`));
        return new Response(null, { status: 204 });
      })
    );
    history.replaceState(null, "", "/home");
    const original = History.prototype.pushState;
    start();
    original.call(history, null, "", "/inner"); // 감싼 함수를 우회
    await settle(1100);
    sp.flush();
    expect(sent).toEqual(["visit:/home", "visit:/inner"]);
    vi.unstubAllGlobals();
    history.replaceState(null, "", "/");
    vi.unstubAllGlobals();
    history.replaceState(null, "", "/");
  });
});

describe("클릭 기록 · 제외", () => {
  function captureSent() {
    const sent: Record<string, unknown>[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init: { body: string }) => {
        sent.push(...(JSON.parse(init.body).events as Record<string, unknown>[]));
        return new Response(null, { status: 204 });
      })
    );
    return sent;
  }

  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
    history.replaceState(null, "", "/");
  });

  it("trackClicks를 켜면 링크 · 버튼 클릭을 이름표와 이동 주소(쿼리 제외)와 함께 남긴다", () => {
    const sent = captureSent();
    document.body.innerHTML = `
      <a id="gh" href="https://github.com/me/repo?tab=1#top">GitHub ↗</a>
      <div data-stuckpoint-label="한평생 오피스 · 프로젝트 보기"><a id="more" href="/project/office">프로젝트 보기 →</a></div>
      <a id="mail" href="mailto:me@example.com">메일</a>
      <p id="txt">그냥 글자</p>`;
    start({ trackClicks: true });
    ["gh", "more", "mail", "txt"].forEach((id) => click(document.getElementById(id)!));
    sp.flush();

    const clicks = sent.filter((e) => e.type === "click");
    expect(clicks.map((e) => [e.label, e.href])).toEqual([
      ["GitHub ↗", "https://github.com/me/repo"],
      ["한평생 오피스 · 프로젝트 보기", "/project/office"],
      ["메일", "mailto:"],
    ]);
    expect(JSON.stringify(sent)).not.toContain("me@example.com");
  });

  it("trackClicks를 켜지 않으면 클릭은 남기지 않는다", () => {
    const sent = captureSent();
    document.body.innerHTML = `<a id="gh" href="/x">x</a>`;
    start();
    click(document.getElementById("gh")!);
    sp.flush();
    expect(sent.filter((e) => e.type === "click")).toHaveLength(0);
  });

  it("?stuckpoint=off로 한 번 열면 이 브라우저는 계속 기록하지 않고, on으로 되돌린다", async () => {
    document.body.innerHTML = `<button id="b">B</button>`;
    history.replaceState(null, "", "/?stuckpoint=off");
    start();
    click(document.getElementById("b")!);
    await settle(1100);
    expect(events).toHaveLength(0);
    sp.destroy();

    history.replaceState(null, "", "/"); // 주소에 표시가 없어도 계속 빠진다
    start();
    click(document.getElementById("b")!);
    await settle(1100);
    expect(events).toHaveLength(0);
    sp.destroy();

    history.replaceState(null, "", "/?stuckpoint=on");
    start();
    click(document.getElementById("b")!);
    await settle(1100);
    expect(events).toHaveLength(1);
  });
});

describe("샘플링", () => {
  it("sampleRate 0이면 아무것도 기록하지 않는다", async () => {
    document.body.innerHTML = `<button id="b">B</button>`;
    start({ sampleRate: 0 });
    click(document.getElementById("b")!);
    await settle(1100);
    expect(events).toHaveLength(0);
  });
});
