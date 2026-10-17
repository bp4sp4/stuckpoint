import { headers } from "next/headers";
import { allowedKeys } from "@/lib/validate";
import Dashboard from "./Dashboard";

export const metadata = { title: "대시보드 — Stuckpoint" };

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ key?: string }> }) {
  const { key } = await searchParams;
  const projects = allowedKeys();
  // 목록에 없는 키는 데모로 보여준다
  const projectKey = key && projects.includes(key) ? key : "demo";

  const h = await headers();
  const host = h.get("x-forwarded-host") || h.get("host") || "localhost:3100";
  const proto = h.get("x-forwarded-proto") || (host.startsWith("localhost") ? "http" : "https");

  return <Dashboard key={projectKey} projectKey={projectKey} projects={projects} origin={`${proto}://${host}`} />;
}
