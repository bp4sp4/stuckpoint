import { getStore } from "@/lib/store";
import { parseBatch } from "@/lib/validate";

export const runtime = "nodejs";

// 어느 사이트에서든 보낼 수 있는 공개 수집 주소
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

/* IP별 간단한 속도 제한 (인스턴스 메모리 기준, 1분에 60번) */
const hits = new Map<string, { n: number; reset: number }>();
function limited(ip: string): boolean {
  const now = Date.now();
  const h = hits.get(ip);
  if (!h || now > h.reset) {
    hits.set(ip, { n: 1, reset: now + 60_000 });
    if (hits.size > 5000) hits.clear();
    return false;
  }
  return ++h.n > 60;
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (limited(ip)) return new Response(null, { status: 429, headers: CORS });

  const raw = await req.text();
  if (raw.length > 100_000) return new Response(null, { status: 413, headers: CORS });

  const events = parseBatch(raw);
  if (events.length > 0) {
    try {
      await getStore().insert(events);
    } catch (err) {
      console.error("[collect] insert failed", err);
      return new Response(null, { status: 500, headers: CORS });
    }
  }
  return new Response(null, { status: 204, headers: CORS });
}
