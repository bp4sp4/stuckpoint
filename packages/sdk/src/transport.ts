import type { Payload } from "./types";

const BATCH = 10;
const INTERVAL = 5000;
const MAX_QUEUE = 100;

/**
 * 이벤트를 모았다가 한 번에 보낸다.
 * - 10개가 모이거나 5초가 지나면 fetch(keepalive)
 * - 탭을 닫거나 숨길 때는 sendBeacon (페이지가 사라져도 전송이 끝까지 간다)
 * 본문은 text/plain으로 보낸다 → 다른 도메인이어도 CORS 사전 요청(preflight)이 생기지 않는다.
 */
export function createTransport(endpoint: string, projectKey: string) {
  let queue: Payload[] = [];
  const timer = setInterval(() => flush(), INTERVAL);

  function body(events: Payload[]) {
    return JSON.stringify({ key: projectKey, events });
  }

  function flush(useBeacon = false) {
    if (queue.length === 0) return;
    const events = queue;
    queue = [];

    if (useBeacon && typeof navigator !== "undefined" && navigator.sendBeacon) {
      const ok = navigator.sendBeacon(endpoint, new Blob([body(events)], { type: "text/plain" }));
      if (ok) return;
    }
    if (typeof fetch !== "function") return;
    fetch(endpoint, { method: "POST", body: body(events), keepalive: true, headers: { "Content-Type": "text/plain" } }).catch(
      () => {
        // 네트워크 실패 시 한 번만 되돌려 둔다 (무한히 쌓이지 않게 상한)
        queue = events.concat(queue).slice(-MAX_QUEUE);
      }
    );
  }

  return {
    push(event: Payload) {
      queue.push(event);
      if (queue.length > MAX_QUEUE) queue = queue.slice(-MAX_QUEUE);
      if (queue.length >= BATCH) flush();
    },
    flush,
    stop() {
      clearInterval(timer);
    },
  };
}
