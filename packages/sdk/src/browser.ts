import { init } from "./index";

export { init };

/**
 * <script> 한 줄 설치:
 * <script src="https://stuckpoint.vercel.app/stuckpoint.global.js"
 *         data-key="my-site" data-endpoint="https://stuckpoint.vercel.app/api/collect" defer></script>
 * data-key가 있으면 자동으로 시작한다. data-clicks="true"를 더하면 클릭도 기록한다.
 */
const script = typeof document !== "undefined" ? (document.currentScript as HTMLScriptElement | null) : null;
const key = script?.dataset.key;
if (script && key) {
  const endpoint = script.dataset.endpoint || new URL("/api/collect", script.src).toString();
  init({ endpoint, projectKey: key, debug: script.dataset.debug === "true", trackClicks: script.dataset.clicks === "true" });
}
