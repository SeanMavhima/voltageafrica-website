import { notFound } from "next/navigation";
import { PageBuilder, type BuilderSection } from "@/components/admin/PageBuilder";
import { requireAdmin } from "@/lib/cms/auth";
import { sectionLabel } from "@/lib/cms/section-types";

export const metadata = { title: "Edit page" };

export default async function EditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { db } = await requireAdmin(`/admin/pages/${id}`);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [{ data: page }, { data: sections }] = await Promise.all([
    db.from("pages").select("id, slug, title, seo_title, seo_description, status, is_system").eq("id", id).maybeSingle(),
    db.from("page_sections").select("id, type, label, content, status, is_visible, sort_order, updated_at").eq("page_id", id).order("sort_order"),
  ]);
  if (!page) notFound();
  const ids = (sections ?? []).map((s) => s.id);
  const { data: drafts } = ids.length ? await db.from("page_section_drafts").select("section_id, content").in("section_id", ids) : { data: [] };
  const draftMap = new Map((drafts ?? []).map((d) => [d.section_id as string, d.content as Record<string, unknown>]));
  const summary = (c: Record<string, unknown>) => {
    const t = [c.headline, c.title, c.text, c.interlude, c.quote].find((x) => typeof x === "string" && x.trim());
    return typeof t === "string" ? t.replace(/\*/g, "").slice(0, 110) : "";
  };
  const builder: BuilderSection[] = (sections ?? []).map((s) => ({
    id: s.id as string,
    type: s.type as string,
    typeLabel: sectionLabel(s.type as string),
    label: (s.label as string) ?? null,
    summary: summary(draftMap.get(s.id as string) ?? (s.content as Record<string, unknown>)),
    status: s.status as string,
    visible: s.is_visible as boolean,
    hasDraft: draftMap.has(s.id as string),
  }));
  return <PageBuilder page={page as never} sections={builder} />;
}
