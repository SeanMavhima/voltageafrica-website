import "server-only";
import type { AdminContext } from "@/lib/cms/auth";
import { engagementKinds, kinds, type EngagementKind } from "./config";

type Db = AdminContext["db"];
export type KindCounts = { total: number; new: number };
export type EngagementCounts = Record<EngagementKind, KindCounts> & { ready: boolean; newTotal: number };

/** True when the error means the engagement migration has not been applied yet. */
export function isMissingTable(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false;
  return error.code === "PGRST205" || error.code === "42P01" || error.code === "42703" || /schema cache|does not exist/i.test(error.message ?? "");
}

/** Live totals and "new" counts for every engagement table (RLS applies: admins only). */
export async function engagementCounts(db: Db): Promise<EngagementCounts> {
  const head = (k: EngagementKind) => db.from(kinds[k].table).select("id", { count: "exact", head: true });
  const results = await Promise.all(engagementKinds.flatMap((k) => [head(k), head(k).eq("status", "new")]));
  const out = { ready: true, newTotal: 0 } as EngagementCounts;
  engagementKinds.forEach((k, i) => {
    const [total, fresh] = [results[i * 2], results[i * 2 + 1]];
    if (total.error || fresh.error) out.ready = false;
    out[k] = { total: total.count ?? 0, new: fresh.count ?? 0 };
    out.newTotal += fresh.count ?? 0;
  });
  return out;
}

export type RecentSubmission = { kind: EngagementKind; id: string; name: string; detail: string; status: string; created_at: string };

/** The most recent submissions across all three inboxes. */
export async function recentSubmissions(db: Db, limit = 6): Promise<RecentSubmission[]> {
  const rows = await Promise.all(
    engagementKinds.map(async (k) => {
      const d = kinds[k];
      const { data, error } = await db.from(d.table).select(`id, ${d.nameCol}, ${d.categoryCol}, status, created_at`).order("created_at", { ascending: false }).limit(limit);
      if (error || !data) return [];
      return (data as unknown as Record<string, string>[]).map((r) => ({ kind: k, id: r.id, name: r[d.nameCol], detail: r[d.categoryCol], status: r.status, created_at: r.created_at }));
    }),
  );
  return rows
    .flat()
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, limit);
}
