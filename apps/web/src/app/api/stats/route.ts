import { aggregate } from "@/lib/aggregate";
import { getStore } from "@/lib/store";
import { allowedKeys } from "@/lib/validate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RANGES: Record<string, number> = { "1h": 3_600_000, "24h": 86_400_000, "7d": 7 * 86_400_000 };

export async function GET(req: Request) {
  const url = new URL(req.url);
  const key = url.searchParams.get("key") || "demo";
  const range = RANGES[url.searchParams.get("range") || "24h"] ?? RANGES["24h"]!;
  if (!allowedKeys().includes(key)) return Response.json({ error: "unknown key" }, { status: 404 });

  const events = await getStore().list(key, Date.now() - range, 5000);
  return Response.json(aggregate(events), { headers: { "Cache-Control": "no-store" } });
}
