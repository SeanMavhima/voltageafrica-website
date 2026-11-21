import Link from "next/link";
import { Award, CalendarPlus, FilePlus2, FolderPlus, Home, ImageUp, Layers, Navigation, Newspaper } from "lucide-react";
import { Badge, Card, PageHeader } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/cms/auth";
import { engagementCounts, recentSubmissions } from "@/lib/engagement/admin";
import { adminInboxPath, kinds, statusLabels, type EngagementStatus } from "@/lib/engagement/config";

export const metadata = { title: "Overview" };

const editHref: Record<string, (id: string) => string> = {
  page: (id) => `/admin/pages/${id}`,
  milestone: (id) => `/admin/timeline/${id}`,
  publication: (id) => `/admin/publications/${id}`,
  award: (id) => `/admin/awards/${id}`,
  project: (id) => `/admin/projects/${id}`,
  technology: (id) => `/admin/technology/${id}`,
  principle: (id) => `/admin/principles/${id}`,
  person: (id) => `/admin/people/${id}`,
  media: () => `/admin/media`,
  section: (id) => `/admin/sections?focus=${id}`,
};

function ago(iso: string) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default async function Overview() {
  const { db, user } = await requireAdmin("/admin");
  const head = (t: string) => db.from(t).select("id", { count: "exact", head: true });
  const draftTables = ["timeline_milestones", "publications", "awards", "projects", "technology_items", "principles", "people"];
  const [engagement, latest, pagesPub, pagesDraft, pubs, miles, media, sectionDrafts, sectionUnpublished, recent, ...drafts] = await Promise.all([
    engagementCounts(db),
    recentSubmissions(db, 6),
    head("pages").eq("status", "published"),
    head("pages").eq("status", "draft"),
    head("publications"),
    head("timeline_milestones"),
    head("media_assets"),
    db.from("page_section_drafts").select("section_id", { count: "exact", head: true }),
    head("page_sections").eq("status", "draft"),
    db.from("admin_recent_edits").select("*").order("updated_at", { ascending: false }).limit(10),
    ...draftTables.map((t) => head(t).eq("status", "draft")),
  ]);
  const draftItems = drafts.reduce((n, r) => n + (r.count ?? 0), 0) + (pagesDraft.count ?? 0) + (sectionUnpublished.count ?? 0);
  const pending = sectionDrafts.count ?? 0;

  const stats = [
    { label: "Published pages", value: pagesPub.count ?? 0, href: "/admin/pages" },
    { label: "Drafts", value: draftItems, href: "/admin/sections" },
    { label: "Publications", value: pubs.count ?? 0, href: "/admin/publications" },
    { label: "Milestones", value: miles.count ?? 0, href: "/admin/timeline" },
    { label: "Media assets", value: media.count ?? 0, href: "/admin/media" },
  ];
  const inbox = [
    { label: "Partnership inquiries", value: engagement.partnerships.total, href: "/admin/engagement?tab=partnerships" },
    { label: "New partnership inquiries", value: engagement.partnerships.new, href: "/admin/engagement?tab=partnerships&status=new", highlight: true },
    { label: "Support inquiries", value: engagement.support.total, href: "/admin/engagement?tab=support" },
    { label: "New support inquiries", value: engagement.support.new, href: "/admin/engagement?tab=support&status=new", highlight: true },
    { label: "Contact messages", value: engagement.contact.total, href: "/admin/engagement?tab=contact" },
    { label: "Unreviewed messages", value: engagement.contact.new, href: "/admin/engagement?tab=contact&status=new", highlight: true },
  ];
  const actions = [
    { href: "/admin/homepage", label: "Edit homepage", icon: Home },
    { href: "/admin/publications/new", label: "Add publication", icon: Newspaper },
    { href: "/admin/timeline/new", label: "Add milestone", icon: CalendarPlus },
    { href: "/admin/projects/new", label: "Add project", icon: FolderPlus },
    { href: "/admin/awards/new", label: "Add award", icon: Award },
    { href: "/admin/media", label: "Upload media", icon: ImageUp },
    { href: "/admin/navigation", label: "Edit navigation", icon: Navigation },
    { href: "/admin/pages", label: "Manage pages", icon: FilePlus2 },
    { href: "/admin/sections", label: "Page sections", icon: Layers },
  ];

  return (
    <>
      <PageHeader title={`Welcome back`} description={`Signed in as ${user.email}.`} />

      <section aria-labelledby="engagement-heading" className="mb-8">
        <div className="mb-3 flex items-baseline justify-between gap-4">
          <h2 id="engagement-heading" className="text-[13px] font-semibold text-ws-ink">
            Engagement Inbox {engagement.newTotal > 0 && <span className="ml-2 rounded-full bg-amber px-2 py-0.5 text-[11px] font-semibold">{engagement.newTotal} new</span>}
          </h2>
          <Link href="/admin/engagement" className="text-[12.5px] font-medium text-forest underline">
            Open inbox
          </Link>
        </div>
        {!engagement.ready ? (
          <p className="rounded-xl border border-amber/40 bg-amber/[0.08] px-4 py-3 text-[13px] text-ws-ink/80">
            The engagement tables are not in the database yet. Run <code className="font-mono text-[12px]">supabase/migrations/20261120000004_engagement.sql</code> in the Supabase SQL Editor.
          </p>
        ) : (
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)]">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              {inbox.map((s) => (
                <Link key={s.label} href={s.href} className={`rounded-xl border bg-white px-4 py-4 transition-colors hover:border-ws-ink/30 ${s.highlight && s.value > 0 ? "border-amber ring-1 ring-amber/40" : "border-ws-line"}`}>
                  <p className="font-serif text-[2rem] leading-none tabular-nums">{s.value}</p>
                  <p className="mt-2 text-[12px] text-ws-ink/60">{s.label}</p>
                </Link>
              ))}
            </div>
            <Card title="Recent submissions">
              {latest.length ? (
                <ul className="divide-y divide-ws-line">
                  {latest.map((r) => (
                    <li key={`${r.kind}-${r.id}`}>
                      <Link href={adminInboxPath(r.kind, r.id)} className="flex items-center gap-3 px-5 py-3 text-[13px] hover:bg-ws">
                        <span className={`h-2 w-2 shrink-0 rounded-full ${r.status === "new" ? "bg-amber" : "bg-ws-ink/15"}`} aria-hidden />
                        <span className="min-w-0 flex-1">
                          <span className={`block truncate ${r.status === "new" ? "font-semibold" : "font-medium"}`}>{r.name}</span>
                          <span className="block truncate text-[12px] text-ws-ink/55">
                            {kinds[r.kind].noun} · {r.detail}
                          </span>
                        </span>
                        <span className="shrink-0 text-right">
                          <Badge status={r.status}>{statusLabels[r.status as EngagementStatus] ?? r.status}</Badge>
                          <span className="mt-1 block text-[11px] text-ws-ink/45">{ago(r.created_at)}</span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="p-5 text-[13px] text-ws-ink/60">No submissions yet. They will appear here as they arrive.</p>
              )}
            </Card>
          </div>
        )}
      </section>

      <h2 className="mb-3 text-[13px] font-semibold text-ws-ink">Website content</h2>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="rounded-xl border border-ws-line bg-white px-4 py-4 transition-colors hover:border-ws-ink/30">
            <p className="font-serif text-[2rem] leading-none tabular-nums">{s.value}</p>
            <p className="mt-2 text-[12px] text-ws-ink/60">{s.label}</p>
          </Link>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card title="Publishing status" className="lg:col-span-1">
          <div className="space-y-3 p-5 text-[13px]">
            <div className="flex items-center justify-between">
              <span>Website</span>
              <Badge status="published">Live</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>Sections with unpublished edits</span>
              <span className="font-semibold tabular-nums">{pending}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Items saved as drafts</span>
              <span className="font-semibold tabular-nums">{draftItems}</span>
            </div>
            <p className="pt-2 text-[12px] leading-relaxed text-ws-ink/55">Drafts are only visible to you. Use Preview to see them on the real site, then Publish.</p>
            <a href="/api/preview?path=/" className="inline-flex h-9 items-center rounded-lg border border-ws-line px-3.5 font-medium hover:border-ws-ink/40">
              Preview the site with drafts
            </a>
          </div>
        </Card>

        <Card title="Quick actions" className="lg:col-span-2">
          <div className="grid grid-cols-2 gap-px bg-ws-line sm:grid-cols-3">
            {actions.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href} className="flex items-center gap-3 bg-white px-5 py-4 text-[13px] font-medium hover:bg-ws">
                <Icon className="h-4 w-4 text-forest" /> {label}
              </Link>
            ))}
          </div>
        </Card>
      </div>

      <Card title="Recent edits" className="mt-6">
        {recent.data?.length ? (
          <ul className="divide-y divide-ws-line">
            {recent.data.map((r) => (
              <li key={`${r.entity}-${r.id}`}>
                <Link href={(editHref[r.entity as string] ?? (() => "/admin"))(r.id as string)} className="flex items-center gap-4 px-5 py-3 text-[13px] hover:bg-ws">
                  <span className="w-24 shrink-0 text-[11px] font-medium uppercase tracking-wider text-ws-ink/45">{r.entity as string}</span>
                  <span className="min-w-0 flex-1 truncate font-medium">{(r.label as string)?.replace(/\*/g, "") || "Untitled"}</span>
                  {r.entity !== "media" && <Badge status={r.status as string} />}
                  <span className="w-28 shrink-0 text-right text-[12px] text-ws-ink/50">{ago(r.updated_at as string)}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="p-5 text-[13px] text-ws-ink/60">Nothing edited yet.</p>
        )}
      </Card>
    </>
  );
}
