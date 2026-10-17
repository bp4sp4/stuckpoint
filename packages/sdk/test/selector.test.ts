import { describe, expect, it } from "vitest";
import { getLabel, getSelector } from "../src/selector";

describe("getSelector", () => {
  it("data-testid를 가장 먼저 쓴다", () => {
    document.body.innerHTML = `<div id="wrap"><button data-testid="buy">구매</button></div>`;
    expect(getSelector(document.querySelector("button")!)).toBe('[data-testid="buy"]');
  });

  it("자동 생성된 id는 건너뛰고 가까운 안정적인 id에서 멈춘다", () => {
    document.body.innerHTML = `<section id="cart"><ul><li></li><li><button id=":r12:">x</button></li></ul></section>`;
    expect(getSelector(document.querySelector("button")!)).toBe("#cart > ul > li:nth-of-type(2) > button");
  });

  it("해시 클래스(CSS Modules)는 쓰지 않는다", () => {
    document.body.innerHTML = `<main><div class="card_a1b2c"><a class="btn_x9y8" href="#">보기</a></div></main>`;
    const sel = getSelector(document.querySelector("a")!);
    expect(sel).not.toContain("btn_x9y8");
    expect(document.querySelector(sel)).toBe(document.querySelector("a"));
  });
});

describe("getLabel", () => {
  it("버튼 글자와 aria-label을 쓴다", () => {
    document.body.innerHTML = `<button>  결제   하기 </button><a aria-label="닫기" href="#">×</a>`;
    expect(getLabel(document.querySelector("button")!)).toBe("결제 하기");
    expect(getLabel(document.querySelector("a")!)).toBe("닫기");
  });

  it("입력창은 값 대신 이름만, 마스크 영역은 태그만 남긴다", () => {
    document.body.innerHTML = `<input name="card" value="1234-5678" /><div data-stuckpoint-mask><button>홍길동</button></div>`;
    expect(getLabel(document.querySelector("input")!)).toBe("input[card]");
    expect(getLabel(document.querySelector("button")!)).toBe("<button>");
  });
});
