// SDK의 <script> 설치용 번들을 public/에 복사한다 → https://<도메인>/stuckpoint.global.js 로 바로 쓸 수 있다
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const src = resolve(here, "../../../packages/sdk/dist/stuckpoint.global.js");
const dest = resolve(here, "../public/stuckpoint.global.js");

if (!existsSync(src)) {
  console.error("SDK 빌드 결과가 없습니다. 루트에서 `npm run build -w stuckpoint`를 먼저 실행하세요.");
  process.exit(1);
}
mkdirSync(dirname(dest), { recursive: true });
copyFileSync(src, dest);
console.log("copied stuckpoint.global.js → public/");
