import { notFound } from "next/navigation";
import { SectionEditor } from "@/components/admin/SectionEditor";
import { requireAdmin } from "@/lib/cms/auth";
import { sectionTypeMap } from "@/lib/cms/section-types";

export const metadata = { title: "Edit section" };

export default async function EditSection({ params }: { params: Promise<{ id: string; sectionId: string }> }) {
  const { id, sectionId } = await params;
  const { db } = await requireAdmin(`/admin/pages/${id}/sections/${sectionId}`);
  if (!/^[0-9a-f-]{36}$/i.test(sectionId)) notFound();
  const [{ data: section }, { data: draft }, { data: page }] = await Promise.all([
    db.from("page_sections").select("id, page_id, type, label, content, settings, status, is_visible, updated_at").eq("id", sectionId).maybeSingle(),
    db.from("page_section_drafts").select("content, settings, updated_at").eq("section_id", sectionId).maybeSingle(),
    db.from("pages").select("id, title, slug").eq("id", id).maybeSingle(),
  ]);
  if (!section || !page || section.page_id !== page.id) notFound();
  const def = sectionTypeMap[section.type as string];
  if (!def) notFound();
  return (
    <SectionEditor
      page={{ id: page.id as string, title: page.title as string, path: page.slug === "home" ? "/" : `/${page.slug}` }}
      section={{
        id: section.id as string,
        type: section.type as string,
        label: (section.label as string) ?? "",
        status: section.status as string,
        visible: section.is_visible as boolean,
        content: (draft?.content ?? section.content) as Record<string, unknown>,
        settings: (draft?.settings ?? section.settings) as Record<string, unknown>,
        publishedContent: section.content as Record<string, unknown>,
        publishedSettings: section.settings as Record<string, unknown>,
        hasDraft: !!draft,
      }}
    />
  );
}
