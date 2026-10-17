/** 감지하는 막힘의 종류 */
export type StuckType =
  /** 같은 자리를 짧은 시간에 여러 번 누름 (반응이 느리거나 없어서 답답할 때) */
  | "rage_click"
  /** 눌릴 것처럼 생겼는데 눌러도 화면에 아무 변화가 없음 */
  | "dead_click"
  /** 폼을 쓰다가 제출하지 않고 떠남 */
  | "form_abandon"
  /** 누른 직후 자바스크립트 오류가 남 */
  | "error_click";

export interface StuckEvent {
  type: StuckType;
  /** location.pathname */
  page: string;
  /** 요소를 다시 찾을 수 있는 CSS 선택자 */
  selector: string;
  /** 사람이 읽을 이름 (버튼 글자 · aria-label). 입력값은 절대 담지 않는다 */
  label: string;
  /** 문서 기준 좌표와 당시 화면 폭 (히트맵용) */
  x: number;
  y: number;
  vw: number;
  /** 분노 클릭 횟수 */
  count?: number;
  /** 폼 이탈: 마지막으로 머문 필드와 진행 정도 */
  field?: string;
  filled?: number;
  total?: number;
  /** 클릭 후 오류 메시지 (120자까지) */
  message?: string;
  /** 같은 방문을 묶는 무작위 id (탭을 닫으면 사라짐) */
  sid: string;
  ts: number;
}

export interface StuckpointOptions {
  /** 이벤트를 받을 주소. 예: https://stuckpoint.vercel.app/api/collect */
  endpoint: string;
  /** 사이트 구분 키 */
  projectKey: string;
  /** 0~1. 방문의 몇 %만 기록할지 (기본 1 = 전부) */
  sampleRate?: number;
  /** 분노 클릭으로 볼 최소 클릭 수 (기본 3) */
  rageClicks?: number;
  /** 분노 클릭을 셀 시간 창 ms (기본 800) */
  rageWindow?: number;
  /** 클릭 후 이 시간 안에 화면이 안 바뀌면 반응 없는 클릭 ms (기본 1000) */
  deadDelay?: number;
  /** 이 선택자에 걸리는 요소는 무시 */
  ignore?: string;
  /** 감지할 때마다 콘솔에 출력 */
  debug?: boolean;
  /** 링크 · 버튼 클릭을 모두 기록한다 (어디를 많이 누르는지 보려고). 기본 false */
  trackClicks?: boolean;
  /** 서버로 보내기 전에 이벤트를 받아본다 (데모 · 테스트용). false를 돌려주면 보내지 않음 */
  onEvent?: (event: StuckEvent) => void | false;
}

/**
 * 방문 기록. 페이지(경로)마다 방문에서 한 번만 보낸다.
 * "막힘 0건"이 방문이 없어서인지 정말 막힘이 없어서인지 구분하고, 막힘 비율을 계산하는 데 쓴다.
 */
export interface VisitEvent {
  type: "visit";
  page: string;
  vw: number;
  sid: string;
  ts: number;
}

/** 클릭 기록 (trackClicks). 링크면 이동할 주소(쿼리 · 해시 제외)를 함께 남긴다 */
export interface ClickEvent {
  type: "click";
  page: string;
  selector: string;
  label: string;
  href?: string;
  x: number;
  y: number;
  vw: number;
  sid: string;
  ts: number;
}

export type Payload = StuckEvent | VisitEvent | ClickEvent;

/** page를 넘기면 그 값을 쓴다 (행동한 시점의 페이지. 감지가 늦게 끝나 주소가 바뀌었어도 정확하게) */
export type Emit = (event: Omit<StuckEvent, "page" | "sid" | "ts" | "vw"> & { page?: string }) => void;

export interface Detector {
  stop(): void;
  /** 페이지를 떠날 때 남은 기록을 정리 (폼 이탈) */
  flush?(): void;
}
