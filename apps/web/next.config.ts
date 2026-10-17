import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 개발 서버를 켠 채로 빌드를 확인할 수 있게 출력 폴더를 바꿀 수 있다
  distDir: process.env.NEXT_DIST_DIR || ".next",
  async headers() {
    return [
      {
        // 다른 사이트에서 <script>로 불러갈 수 있게
        source: "/stuckpoint.global.js",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Cache-Control", value: "public, max-age=3600" },
        ],
      },
    ];
  },
};

export default nextConfig;
