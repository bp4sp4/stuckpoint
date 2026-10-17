import { aggregate } from "@/lib/aggregate";
import { getStore } from "@/lib/store";
import { allowedKeys } from "@/lib/validate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// all = 전체 기간. 데모 대시보드는 나중에 와서 봐도 비어 보이지 않게 전체가 기본값
const RANGES: Record<string, number> = { "24h": 86_400_000, "7d": 7 * 86_400_000, all: Number.POSITIVE_INFINITY };

export async function GET(req: Request) {
  const url = new URL(req.url);
  const key = url.searchParams.get("key") || "demo";
  const range = RANGES[url.searchParams.get("range") || "all"] ?? RANGES.all!;
  if (!allowedKeys().includes(key)) return Response.json({ error: "unknown key" }, { status: 404 });

  const events = await getStore().list(key, Number.isFinite(range) ? Date.now() - range : 0, 5000);
  return Response.json(aggregate(events), { headers: { "Cache-Control": "no-store" } });
}
