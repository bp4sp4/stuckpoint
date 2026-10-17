import { headers } from "next/headers";
import { allowedKeys, canView } from "@/lib/validate";
import Dashboard from "./Dashboard";

export const metadata = { title: "대시보드 — Stuckpoint", robots: { index: false } };

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ key?: string; token?: string }> }) {
  const { key, token } = await searchParams;
  // 볼 수 있는 프로젝트만 고를 수 있게 한다 (비공개 프로젝트는 토큰이 맞을 때만 목록에 보인다)
  const projects = allowedKeys().filter((k) => canView(k, token));
  const requested = key && allowedKeys().includes(key) ? key : "demo";
  const projectKey = projects.includes(requested) ? requested : "demo";

  const h = await headers();
  const host = h.get("x-forwarded-host") || h.get("host") || "localhost:3100";
  const proto = h.get("x-forwarded-proto") || (host.startsWith("localhost") ? "http" : "https");

  return (
    <Dashboard
      key={projectKey}
      projectKey={projectKey}
      projects={projects}
      origin={`${proto}://${host}`}
      token={projects.length > 1 ? token : undefined}
      locked={requested !== projectKey}
    />
  );
}
