import { defineConfig } from "tsup";

export default defineConfig([
  // npm 패키지용 (import / require)
  {
    entry: { index: "src/index.ts" },
    format: ["esm", "cjs"],
    dts: true,
    clean: true,
    minify: true,
    target: "es2019",
  },
  // <script> 한 줄 설치용 (window.Stuckpoint + data-* 자동 시작)
  {
    entry: { stuckpoint: "src/browser.ts" },
    format: ["iife"],
    globalName: "Stuckpoint",
    minify: true,
    target: "es2019",
    outExtension: () => ({ js: ".global.js" }),
  },
]);
