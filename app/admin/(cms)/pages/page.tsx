import Link from "next/link";
import { Badge, Card, PageHeader } from "@/components/admin/ui";
import { CreatePageForm } from "@/components/admin/PageBuilder";
import { requireAdmin } from "@/lib/cms/auth";

export const metadata = { title: "Pages" };

export default async function PagesList() {
  const { db } = await requireAdmin("/admin/pages");
  const [{ data: pages }, { data: sections }, { data: drafts }] = await Promise.all([
    db.from("pages").select("id, slug, title, status, is_system, updated_at").order("sort_order"),
    db.from("page_sections").select("id, page_id"),
    db.from("page_section_drafts").select("section_id"),
  ]);
  const draftSet = new Set((drafts ?? []).map((d) => d.section_id));
  return (
    <>
      <PageHeader title="Pages" description="Every page on the website. Open a page to edit its sections, change their order, or hide them." actions={<CreatePageForm />} />
      <Card>
        <table className="w-full text-left text-[13px]">
          <thead className="border-b border-ws-line text-[11px] uppercase tracking-wider text-ws-ink/50">
            <tr>
              <th className="px-5 py-3 font-medium">Page</th>
              <th className="hidden px-5 py-3 font-medium sm:table-cell">Address</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="hidden px-5 py-3 font-medium md:table-cell">Sections</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ws-line">
            {(pages ?? []).map((p) => {
              const secs = (sections ?? []).filter((s) => s.page_id === p.id);
              const pending = secs.filter((s) => draftSet.has(s.id)).length;
              return (
                <tr key={p.id} className="hover:bg-ws">
                  <td className="px-5 py-3">
                    <Link href={`/admin/pages/${p.id}`} className="font-medium hover:underline">
                      {p.title}
                    </Link>
                    {p.is_system && <span className="ml-2 text-[11px] text-ws-ink/40">built-in</span>}
                  </td>
                  <td className="hidden px-5 py-3 font-mono text-[12px] text-ws-ink/60 sm:table-cell">{p.slug === "home" ? "/" : `/${p.slug}`}</td>
                  <td className="px-5 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      <Badge status={p.status as string} />
                      {pending > 0 && <Badge status="draft changes">{pending} unpublished edit{pending > 1 ? "s" : ""}</Badge>}
                    </div>
                  </td>
                  <td className="hidden px-5 py-3 tabular-nums text-ws-ink/60 md:table-cell">{secs.length}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </>
  );
}
