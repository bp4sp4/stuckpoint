import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { StoredEvent } from "./validate";

/** 저장소를 바꿔 끼울 수 있게 두 가지 동작만 정의한다 */
export interface Store {
  insert(events: StoredEvent[]): Promise<void>;
  /** sinceMs 이후의 이벤트, 최신순, 최대 limit개 */
  list(projectKey: string, sinceMs: number, limit: number): Promise<StoredEvent[]>;
}

/* ---------- Supabase (배포용) ---------- */

type Row = {
  project_key: string;
  type: StoredEvent["type"];
  page: string;
  selector: string;
  label: string;
  x: number;
  y: number;
  vw: number;
  count: number | null;
  field: string | null;
  filled: number | null;
  total: number | null;
  message: string | null;
  href: string | null;
  sid: string;
  ts: string;
};

const toRow = (e: StoredEvent): Row => ({
  project_key: e.projectKey,
  type: e.type,
  page: e.page,
  selector: e.selector,
  label: e.label,
  x: e.x,
  y: e.y,
  vw: e.vw,
  count: e.count ?? null,
  field: e.field ?? null,
  filled: e.filled ?? null,
  total: e.total ?? null,
  message: e.message ?? null,
  href: e.href ?? null,
  sid: e.sid,
  ts: new Date(e.ts).toISOString(),
});

const fromRow = (r: Row): StoredEvent => ({
  projectKey: r.project_key,
  type: r.type,
  page: r.page,
  selector: r.selector,
  label: r.label,
  x: r.x,
  y: r.y,
  vw: r.vw,
  count: r.count ?? undefined,
  field: r.field ?? undefined,
  filled: r.filled ?? undefined,
  total: r.total ?? undefined,
  message: r.message ?? undefined,
  href: r.href ?? undefined,
  sid: r.sid,
  ts: new Date(r.ts).getTime(),
});

function supabaseStore(db: SupabaseClient): Store {
  return {
    async insert(events) {
      const { error } = await db.from("stuck_events").insert(events.map(toRow));
      if (error) throw error;
    },
    async list(projectKey, sinceMs, limit) {
      const { data, error } = await db
        .from("stuck_events")
        .select("project_key,type,page,selector,label,x,y,vw,count,field,filled,total,message,href,sid,ts")
        .eq("project_key", projectKey)
        .gte("ts", new Date(sinceMs).toISOString())
        .order("ts", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data as Row[]).map(fromRow);
    },
  };
}

/* ---------- 로컬 파일 (개발용) ---------- */

function fileStore(): Store {
  const dir = join(process.cwd(), ".data");
  const file = join(dir, "events.json");
  let lock = Promise.resolve();

  const read = async (): Promise<StoredEvent[]> => {
    try {
      return JSON.parse(await readFile(file, "utf8")) as StoredEvent[];
    } catch {
      return [];
    }
  };

  return {
    insert(events) {
      // 동시에 들어온 요청이 서로 덮어쓰지 않게 순서대로 쓴다
      lock = lock.then(async () => {
        const all = await read();
        all.push(...events);
        await mkdir(dir, { recursive: true });
        await writeFile(file, JSON.stringify(all.slice(-20_000)));
      });
      return lock;
    },
    async list(projectKey, sinceMs, limit) {
      await lock;
      return (await read())
        .filter((e) => e.projectKey === projectKey && e.ts >= sinceMs)
        .sort((a, b) => b.ts - a.ts)
        .slice(0, limit);
    },
  };
}

let store: Store | undefined;

export function getStore(): Store {
  if (!store) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    store = url && key ? supabaseStore(createClient(url, key, { auth: { persistSession: false } })) : fileStore();
  }
  return store;
}
