import Link from "next/link";
import { ArrowLeft, ExternalLink, Inbox, Search } from "lucide-react";
import { NotesEditor, StatusControl, SubmissionActions } from "@/components/admin/EngagementControls";
import { Badge, Card, EmptyState, PageHeader } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/cms/auth";
import { engagementCounts, isMissingTable } from "@/lib/engagement/admin";
import { engagementKinds, engagementStatuses, formatAmount, isEngagementKind, kinds, statusLabels, supportForms, type EngagementKind, type EngagementStatus } from "@/lib/engagement/config";
import { cn } from "@/lib/utils";

export const metadata = { title: "Engagement Inbox" };

type Params = { tab?: string; status?: string; q?: string; sort?: string; id?: string };
type Row = Record<string, unknown>;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const str = (v: unknown) => (typeof v === "string" ? v : v == null ? "" : String(v));

function fmtDate(iso: unknown, style: "short" | "long" = "short") {
  const d = new Date(str(iso));
  if (Number.isNaN(d.getTime())) return "";
  if (style === "long") return d.toLocaleString("en-GB", { dateStyle: "full", timeStyle: "short" });
  const today = new Date();
  return d.toDateString() === today.toDateString()
    ? d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: d.getFullYear() === today.getFullYear() ? undefined : "numeric" });
}

/** Characters that would break a PostgREST or() filter are removed; the value itself is quoted. */
const searchTerm = (q: string) => q.replace(/["\\%_*(),:]/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);

export default async function EngagementInbox({ searchParams }: { searchParams: Promise<Params> }) {
  const sp = await searchParams;
  const { db } = await requireAdmin("/admin/engagement");
  const kind: EngagementKind = isEngagementKind(sp.tab) ? sp.tab : "partnerships";
  const status = (engagementStatuses as readonly string[]).includes(sp.status ?? "") ? (sp.status as EngagementStatus) : "all";
  const sort = sp.sort === "oldest" ? "oldest" : "newest";
  const q = (sp.q ?? "").slice(0, 100);
  const term = searchTerm(q);
  const selectedId = sp.id && UUID.test(sp.id) ? sp.id : null;
  const def = kinds[kind];

  const href = (over: Partial<Params>) => {
    const p = { tab: kind, status: status === "all" ? undefined : status, q: q || undefined, sort: sort === "newest" ? undefined : sort, id: undefined as string | undefined, ...over };
    const qs = new URLSearchParams(Object.entries(p).filter(([, v]) => v) as [string, string][]).toString();
    return `/admin/engagement${qs ? `?${qs}` : ""}`;
  };

  let list = db.from(def.table).select(def.listCols).order("created_at", { ascending: sort === "oldest" }).limit(200);
  if (status !== "all") list = list.eq("status", status);
  if (term) list = list.or(def.searchCols.map((c) => `${c}.ilike."%${term}%"`).join(","));

  const [counts, statusRows, listRes, selectedRes] = await Promise.all([
    engagementCounts(db),
    db.from(def.table).select("status").limit(10000),
    list,
    selectedId ? db.from(def.table).select("*").eq("id", selectedId).maybeSingle() : Promise.resolve({ data: null, error: null }),
  ]);

  if (isMissingTable(listRes.error) || !counts.ready) {
    return (
      <>
        <PageHeader title="Engagement Inbox" description="Partnership requests, support inquiries and contact messages." />
        <Card>
          <EmptyState
            title="One database step remaining"
            body="Run supabase/migrations/20261120000004_engagement.sql in the Supabase SQL Editor, then re-run supabase/seed.sql. The inbox will appear here as soon as the tables exist."
          />
        </Card>
      </>
    );
  }
  if (listRes.error) console.error("[engagement inbox]", listRes.error.message);

  const rows = ((listRes.data ?? []) as unknown as Row[]) ?? [];
  const byStatus = new Map<string, number>();
  for (const r of (statusRows.data ?? []) as Row[]) byStatus.set(str(r.status), (byStatus.get(str(r.status)) ?? 0) + 1);
  const selected = (selectedRes.data as Row | null) ?? null;
  const missing = Boolean(selectedId && !selected);

  return (
    <>
      <PageHeader
        title="Engagement Inbox"
        description="Partnership requests, support inquiries and contact messages from the website. Only administrators can see them."
        actions={
          <a href={kind === "partnerships" ? "/partner" : kind === "support" ? "/support" : "/contact"} target="_blank" rel="noopener noreferrer" className="inline-flex h-9 items-center gap-2 rounded-lg border border-ws-line bg-white px-3.5 text-[13px] font-medium hover:border-ws-ink/40">
            View the public form <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          </a>
        }
      />

      {/* Tabs */}
      <nav aria-label="Inbox" className="mb-5 grid gap-2 sm:grid-cols-3">
        {engagementKinds.map((k) => {
          const on = k === kind;
          const c = counts[k];
          return (
            <Link
              key={k}
              href={`/admin/engagement?tab=${k}`}
              aria-current={on ? "page" : undefined}
              className={cn("flex items-center justify-between gap-3 rounded-xl border px-4 py-3.5 transition-colors", on ? "border-ws-ink bg-ws-ink text-white" : "border-ws-line bg-white hover:border-ws-ink/30")}
            >
              <span>
                <span className="block text-[13.5px] font-semibold">{kinds[k].label}</span>
                <span className={cn("text-[12px]", on ? "text-white/60" : "text-ws-ink/55")}>{c.total} total</span>
              </span>
              {c.new > 0 && <span className="rounded-full bg-amber px-2 py-0.5 text-[12px] font-semibold text-ws-ink">{c.new} new</span>}
            </Link>
          );
        })}
      </nav>

      {/* Filters */}
      <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap gap-1 rounded-lg bg-ws-ink/[0.06] p-1 text-[12.5px] font-medium">
          {(["all", ...engagementStatuses] as const).map((s) => {
            const n = s === "all" ? counts[kind].total : (byStatus.get(s) ?? 0);
            return (
              <Link key={s} href={href({ status: s === "all" ? undefined : s })} className={cn("rounded-md px-2.5 py-1.5", s === status ? "bg-white shadow-sm" : "text-ws-ink/60 hover:text-ws-ink")}>
                {s === "all" ? "All" : statusLabels[s]} <span className="tabular-nums text-ws-ink/40">{n}</span>
              </Link>
            );
          })}
        </div>
        <form action="/admin/engagement" className="flex flex-wrap items-center gap-2" role="search">
          <input type="hidden" name="tab" value={kind} />
          {status !== "all" && <input type="hidden" name="status" value={status} />}
          <label className="relative">
            <span className="sr-only">Search</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ws-ink/40" aria-hidden />
            <input name="q" defaultValue={q} placeholder={kind === "support" ? "Name, email or keyword" : "Name, organisation, email or keyword"} className="h-9 w-[min(80vw,18rem)] rounded-lg border border-ws-line bg-white pl-9 pr-3 text-[13px] outline-none focus:border-ws-ink/50" />
          </label>
          <label>
            <span className="sr-only">Sort</span>
            <select name="sort" defaultValue={sort} className="h-9 rounded-lg border border-ws-line bg-white px-2.5 text-[13px] outline-none focus:border-ws-ink/50">
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
          </label>
          <button type="submit" className="h-9 rounded-lg bg-ws-ink px-3.5 text-[13px] font-medium text-white hover:bg-forest">
            Apply
          </button>
          {q && (
            <Link href={href({ q: undefined })} className="text-[13px] text-ws-ink/60 underline hover:text-ws-ink">
              Clear search
            </Link>
          )}
        </form>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)]">
        {/* List */}
        <Card className={cn("self-start overflow-hidden", selected && "hidden lg:block")}>
          {!rows.length ? (
            <EmptyState title={q || status !== "all" ? "Nothing matches" : "No submissions yet"} body={q || status !== "all" ? "Try another search or status." : `New ${def.noun.toLowerCase()}s from the website will appear here.`} />
          ) : (
            <ul className="max-h-[calc(100vh-15rem)] divide-y divide-ws-line overflow-y-auto" aria-label={def.label}>
              {rows.map((r) => {
                const id = str(r.id);
                const isNew = r.status === "new";
                const on = id === selectedId;
                const amount = kind === "support" ? formatAmount(r.amount, r.currency) : null;
                return (
                  <li key={id}>
                    <Link href={href({ id })} aria-current={on ? "true" : undefined} className={cn("relative flex gap-3 px-4 py-3.5 transition-colors", on ? "bg-amber/[0.12]" : "hover:bg-ws")}>
                      {on && <span className="absolute inset-y-0 left-0 w-[3px] bg-amber" aria-hidden />}
                      <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", isNew ? "bg-amber" : "bg-transparent")} aria-hidden />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline justify-between gap-3">
                          <span className={cn("truncate text-[13.5px]", isNew ? "font-semibold" : "font-medium")}>{str(r[def.nameCol])}</span>
                          <span className="shrink-0 text-[11.5px] tabular-nums text-ws-ink/50">{fmtDate(r.created_at)}</span>
                        </span>
                        {def.orgCol && str(r[def.orgCol]) && <span className="block truncate text-[12.5px] text-ws-ink/60">{str(r[def.orgCol])}</span>}
                        <span className="mt-1 line-clamp-1 block text-[12.5px] text-ws-ink/55">{str(r[def.previewCol]) || str(r.message)}</span>
                        <span className="mt-2 flex flex-wrap items-center gap-1.5">
                          <Badge status={str(r.status)}>{isNew ? "New" : statusLabels[r.status as EngagementStatus] ?? str(r.status)}</Badge>
                          <span className="truncate text-[11.5px] text-ws-ink/50">{str(r[def.categoryCol])}</span>
                          {amount && <span className="text-[11.5px] font-medium tabular-nums text-ws-ink/70">· {amount}</span>}
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
          {rows.length >= 200 && <p className="border-t border-ws-line px-4 py-2.5 text-[12px] text-ws-ink/50">Showing the first 200. Narrow the list with search or a status.</p>}
        </Card>

        {/* Detail */}
        {selected ? (
          <Detail kind={kind} row={selected} backHref={href({})} />
        ) : (
          <Card className={cn("self-start", !missing && "hidden lg:block")}>
            <div className="flex flex-col items-center justify-center px-6 py-24 text-center">
              <Inbox className="h-8 w-8 text-ws-ink/25" aria-hidden />
              <p className="mt-4 font-medium">{missing ? "This submission no longer exists" : "Select a submission"}</p>
              <p className="mt-1 max-w-[40ch] text-[13px] text-ws-ink/55">{missing ? "It may have been deleted. Choose another from the list." : "Its details, status and your private notes open here."}</p>
            </div>
          </Card>
        )}
      </div>
    </>
  );
}

function Field({ label, children, wide }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className={wide ? "sm:col-span-2" : undefined}>
      <dt className="text-[11px] font-medium uppercase tracking-wider text-ws-ink/45">{label}</dt>
      <dd className="mt-1 break-words text-[14px] text-ws-ink">{children}</dd>
    </div>
  );
}

function Detail({ kind, row: r, backHref }: { kind: EngagementKind; row: Row; backHref: string }) {
  const def = kinds[kind];
  const id = str(r.id);
  const name = str(r[def.nameCol]);
  const email = str(r.email);
  const subjectLine = kind === "contact" ? `Re: ${str(r.subject) || str(r.inquiry)}` : kind === "partnerships" ? "Re: Partnership with VoltageAfrica" : "Re: Supporting VoltageAfrica";
  const reply = `mailto:${email}?subject=${encodeURIComponent(subjectLine)}`;
  const mail = (
    <a href={`mailto:${email}`} className="text-forest underline">
      {email}
    </a>
  );

  return (
    <Card className="self-start">
      <div className="border-b border-ws-line px-5 py-5 sm:px-6">
        <Link href={backHref} className="mb-3 inline-flex items-center gap-1 text-[12px] font-medium text-ws-ink/55 hover:text-ws-ink lg:hidden">
          <ArrowLeft className="h-3 w-3" aria-hidden /> All {def.label.toLowerCase()}
        </Link>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-amber-ink">{str(r[def.categoryCol])}</p>
            <h2 className="mt-1.5 font-serif text-[1.75rem] leading-tight text-ws-ink">{name}</h2>
            {def.orgCol && str(r[def.orgCol]) && <p className="mt-0.5 text-[14px] text-ws-ink/65">{str(r[def.orgCol])}</p>}
            <p className="mt-2 text-[12.5px] text-ws-ink/50">Received {fmtDate(r.created_at, "long")}</p>
          </div>
          <SubmissionActions kind={kind} id={id} replyHref={reply} backHref={backHref} />
        </div>
      </div>

      <div className="space-y-7 px-5 py-6 sm:px-6">
        <section aria-label="Status">
          <h3 className="mb-2 text-[12px] font-semibold text-ws-ink">Status</h3>
          <StatusControl key={`${id}-${str(r.status)}`} kind={kind} id={id} status={str(r.status)} />
        </section>

        <dl className="grid gap-x-6 gap-y-4 rounded-xl bg-ws px-5 py-4 sm:grid-cols-2">
          <Field label="Email">{mail}</Field>
          {kind === "partnerships" && (
            <>
              <Field label="Phone">{str(r.phone) ? <a href={`tel:${str(r.phone).replace(/[^\d+]/g, "")}`} className="underline">{str(r.phone)}</a> : "—"}</Field>
              <Field label="Country">{str(r.country)}</Field>
              <Field label="Category">{str(r.category)}</Field>
              <Field label="Website or LinkedIn" wide>
                {str(r.website) ? (
                  <a href={str(r.website)} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1 text-forest underline">
                    {str(r.website)} <ExternalLink className="h-3 w-3" aria-hidden />
                  </a>
                ) : (
                  "—"
                )}
              </Field>
            </>
          )}
          {kind === "support" && (
            <>
              <Field label="Country">{str(r.country)}</Field>
              <Field label="Support type">{str(r.support_type)}</Field>
              <Field label="Form of support">{supportForms.find((f) => f.value === r.support_form)?.label ?? str(r.support_form)}</Field>
              <Field label="Proposed amount">{formatAmount(r.amount, r.currency) ?? "Not specified"}</Field>
              <Field label="Area of support" wide>
                {str(r.support_area)}
              </Field>
            </>
          )}
          {kind === "contact" && (
            <>
              <Field label="Category">{str(r.inquiry)}</Field>
              {str(r.organisation) && <Field label="Organisation">{str(r.organisation)}</Field>}
              <Field label="Subject" wide>
                {str(r.subject) || "—"}
              </Field>
            </>
          )}
          <Field label="Consent to contact">{kind === "contact" ? "Implied (contact form)" : r.consent ? "Given" : "Not given"}</Field>
          {r.responded_at ? <Field label="Responded">{fmtDate(r.responded_at, "long")}</Field> : null}
        </dl>

        {kind === "partnerships" && (
          <section>
            <h3 className="mb-2 text-[12px] font-semibold text-ws-ink">Proposal / area of collaboration</h3>
            <p className="text-[15px] leading-relaxed">{str(r.proposal)}</p>
          </section>
        )}

        <section>
          <h3 className="mb-2 text-[12px] font-semibold text-ws-ink">Message</h3>
          <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-ws-ink">{str(r.message)}</p>
        </section>

        {kind === "support" && (
          <p className="rounded-lg border border-amber/40 bg-amber/[0.08] px-4 py-3 text-[12.5px] leading-relaxed text-ws-ink/75">
            This is a support inquiry, not a payment. No money has been collected; any contribution is arranged directly with the supporter.
          </p>
        )}

        <section className="border-t border-ws-line pt-6">
          <h3 className="mb-2 text-[12px] font-semibold text-ws-ink">Private notes</h3>
          <NotesEditor key={id} kind={kind} id={id} notes={str(r.admin_notes)} />
        </section>

        <p className="text-[11.5px] text-ws-ink/40">
          Last updated {fmtDate(r.updated_at, "long")} · ID {id}
        </p>
      </div>
    </Card>
  );
}
