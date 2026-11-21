import Link from "next/link";
import { Badge, Card, PageHeader } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/cms/auth";
import { sectionLabel } from "@/lib/cms/section-types";

export const metadata = { title: "Sections" };

export default async function AllSections({ searchParams }: { searchParams: Promise<{ focus?: string; filter?: string }> }) {
  const { focus, filter } = await searchParams;
  const { db } = await requireAdmin("/admin/sections");
  const [{ data: pages }, { data: sections }, { data: drafts }] = await Promise.all([
    db.from("pages").select("id, title, slug, sort_order").order("sort_order"),
    db.from("page_sections").select("id, page_id, type, label, status, is_visible, sort_order, updated_at").order("sort_order"),
    db.from("page_section_drafts").select("section_id"),
  ]);
  const draftSet = new Set((drafts ?? []).map((d) => d.section_id));
  const rows = (sections ?? []).filter((s) => (filter === "pending" ? draftSet.has(s.id) || s.status === "draft" : true));
  return (
    <>
      <PageHeader
        title="Sections"
        description="Every section on every page. Open one to edit it, or open its page to reorder, hide or add sections."
        actions={
          <div className="flex rounded-lg bg-ws-ink/[0.06] p-1 text-[13px] font-medium">
            <Link href="/admin/sections" className={`rounded-md px-3 py-1 ${filter !== "pending" ? "bg-white shadow-sm" : "text-ws-ink/60"}`}>
              All
            </Link>
            <Link href="/admin/sections?filter=pending" className={`rounded-md px-3 py-1 ${filter === "pending" ? "bg-white shadow-sm" : "text-ws-ink/60"}`}>
              Unpublished edits
            </Link>
          </div>
        }
      />
      <div className="space-y-6">
        {(pages ?? []).map((p) => {
          const secs = rows.filter((s) => s.page_id === p.id);
          if (!secs.length) return null;
          return (
            <Card
              key={p.id}
              title={p.title}
              actions={
                <Link href={`/admin/pages/${p.id}`} className="text-[12px] font-medium text-forest hover:underline">
                  Open page builder
                </Link>
              }
            >
              <ul className="divide-y divide-ws-line">
                {secs.map((s) => (
                  <li key={s.id} className={s.id === focus ? "bg-amber/10" : undefined}>
                    <Link href={`/admin/pages/${p.id}/sections/${s.id}`} className="flex items-center gap-3 px-5 py-3 text-[13px] hover:bg-ws">
                      <span className="flex-1 font-medium">{(s.label as string) || sectionLabel(s.type as string)}</span>
                      {s.status !== "published" && <Badge status={s.status as string} />}
                      {draftSet.has(s.id) && <Badge status="draft changes">edited</Badge>}
                      {!s.is_visible && <Badge status="hidden" />}
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          );
        })}
        {rows.length === 0 && <p className="text-[13px] text-ws-ink/60">No sections with unpublished edits. Everything is live.</p>}
      </div>
    </>
  );
}
