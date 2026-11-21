import { notFound } from "next/navigation";
import { CollectionList } from "@/components/admin/CollectionList";
import { requireAdmin } from "@/lib/cms/auth";
import { collections, imageColumns, isCollectionKey } from "@/lib/cms/collections";
import { mediaUrl } from "@/lib/supabase/env";

export async function generateMetadata({ params }: { params: Promise<{ collection: string }> }) {
  const { collection } = await params;
  return { title: isCollectionKey(collection) ? collections[collection].label : "Not found" };
}

export default async function CollectionPage({ params, searchParams }: { params: Promise<{ collection: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { collection } = await params;
  if (!isCollectionKey(collection)) notFound();
  const def = collections[collection];
  const { db } = await requireAdmin(`/admin/${collection}`);
  const sp = await searchParams;
  const filterValue = def.filter ? sp[def.filter.field] ?? def.filter.options[0].value : undefined;
  const img = imageColumns(def)[0];
  let q = db.from(def.table).select(img ? `*, thumb:${img}(bucket, path)` : "*").order("sort_order");
  if (def.filter && filterValue) q = q.eq(def.filter.field, filterValue);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  const rows = ((data ?? []) as unknown as Record<string, unknown>[]).map((r) => {
    const t = r.thumb as { bucket: string; path: string } | null;
    return { ...r, thumb: t ? mediaUrl(t.bucket, t.path) : null };
  });
  return <CollectionList collectionKey={collection} rows={rows} filterValue={filterValue} />;
}
