import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Stuckpoint — 사용자가 막히는 순간을 잡아내는 3KB 스크립트",
  description: "분노 클릭 · 반응 없는 클릭 · 폼 이탈 · 클릭 후 오류를 감지해 어디서 사용자가 막히는지 보여줍니다.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
