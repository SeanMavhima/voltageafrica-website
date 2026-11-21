import { notFound } from "next/navigation";
import { CollectionEditor, type Relations } from "@/components/admin/CollectionEditor";
import { requireAdmin } from "@/lib/cms/auth";
import { collections, imageColumns, isCollectionKey } from "@/lib/cms/collections";
import { emptyValue } from "@/lib/cms/fields";
import { mediaUrl } from "@/lib/supabase/env";

export const metadata = { title: "Edit" };

type Row = Record<string, unknown>;
const MEDIA = "id, bucket, path, alt_text";

export default async function EditItem({ params, searchParams }: { params: Promise<{ collection: string; id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { collection, id } = await params;
  if (!isCollectionKey(collection)) notFound();
  const def = collections[collection];
  const { db } = await requireAdmin(`/admin/${collection}/${id}`);
  const sp = await searchParams;
  const isNew = id === "new";
  if (!isNew && !/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const imgCols = imageColumns(def);
  let values: Row = emptyValue(def.fields);
  let status = "draft";
  if (def.filter && sp[def.filter.field]) values[def.filter.field] = sp[def.filter.field];
  if (collection === "navigation") values.is_visible = true;

  if (!isNew) {
    const select = ["*", ...imgCols.map((c) => `${c}_media:${c}(${MEDIA})`)].join(", ");
    const { data } = await db.from(def.table).select(select).eq("id", id).maybeSingle();
    if (!data) notFound();
    const row = data as unknown as Row;
    values = { ...values };
    for (const f of def.fields) {
      if (f.kind === "image") {
        const m = row[`${f.name}_media`] as Row | null;
        values[f.name] = m ? { id: m.id, src: mediaUrl(String(m.bucket), String(m.path)), alt: m.alt_text ?? "" } : null;
      } else if (f.kind === "date") values[f.name] = row[f.name] ?? "";
      else values[f.name] = row[f.name] ?? (f.kind === "tags" || f.kind === "list" ? [] : f.kind === "boolean" ? false : "");
    }
    status = String(row.status ?? "draft");
  }

  let relations: Relations | undefined;
  if (collection === "projects") {
    const [ms, pubs] = await Promise.all([db.from("timeline_milestones").select("id, title, date_label").order("sort_order"), db.from("publications").select("id, headline, outlet").order("sort_order")]);
    let gallery: Row[] = [];
    let selMs: string[] = [];
    let selPubs: string[] = [];
    if (!isNew) {
      const [g, pm, pp] = await Promise.all([
        db.from("project_gallery").select(`caption, sort_order, media:media_id(${MEDIA})`).eq("project_id", id).order("sort_order"),
        db.from("project_milestones").select("milestone_id").eq("project_id", id),
        db.from("project_publications").select("publication_id").eq("project_id", id),
      ]);
      gallery = ((g.data ?? []) as unknown as Row[]).map((x) => {
        const m = x.media as Row;
        return { image: m ? { id: m.id, src: mediaUrl(String(m.bucket), String(m.path)), alt: m.alt_text ?? "" } : null, caption: x.caption ?? "" };
      });
      selMs = (pm.data ?? []).map((x) => x.milestone_id as string);
      selPubs = (pp.data ?? []).map((x) => x.publication_id as string);
    }
    relations = {
      gallery,
      milestones: (ms.data ?? []).map((m) => ({ id: m.id as string, label: `${m.date_label} · ${m.title}` })),
      publications: (pubs.data ?? []).map((p) => ({ id: p.id as string, label: `${p.outlet} · ${p.headline}` })),
      selectedMilestones: selMs,
      selectedPublications: selPubs,
    };
  }

  return <CollectionEditor collectionKey={collection} id={isNew ? null : id} initial={values} status={status} relations={relations} />;
}
