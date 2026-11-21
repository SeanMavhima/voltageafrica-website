"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowLeft, Copy, Eye, EyeOff, GripVertical, Pencil, Plus, Trash2, X } from "lucide-react";
import {
  addSection,
  createPage,
  deletePage,
  deleteSection,
  duplicateSection,
  publishPage,
  reorderSections,
  savePageMeta,
  setPageStatus,
  setSectionVisibility,
  type ActionResult,
} from "@/lib/cms/actions";
import { sectionTypes, type SectionGroup } from "@/lib/cms/section-types";
import { cn } from "@/lib/utils";
import { Badge, Btn, Card, Confirm, PageHeader, useAction } from "./ui";

export type BuilderSection = { id: string; type: string; typeLabel: string; label: string | null; summary: string; status: string; visible: boolean; hasDraft: boolean };
type PageRow = { id: string; slug: string; title: string; seo_title: string | null; seo_description: string | null; status: string; is_system: boolean };

const field = "w-full rounded-lg border border-ws-line bg-white px-3 py-2 text-[14px] outline-none focus:border-ws-ink/50";

/* ─── Create page ─── */
export function CreatePageForm() {
  const ref = useRef<HTMLDialogElement>(null);
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(createPage, null);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [touched, setTouched] = useState(false);
  const auto = (t: string) =>
    t
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60);
  const err = state && !state.ok ? state.fieldErrors ?? {} : {};
  return (
    <>
      <Btn variant="primary" onClick={() => ref.current?.showModal()}>
        <Plus className="h-4 w-4" /> New page
      </Btn>
      <dialog ref={ref} className="m-auto w-[min(92vw,30rem)] rounded-2xl border border-ws-line bg-white p-0 shadow-2xl backdrop:bg-ws-ink/40">
        <form action={action} className="p-6">
          <h2 className="font-serif text-2xl">New page</h2>
          <p className="mt-1 text-[13px] text-ws-ink/60">Created as a draft with an opening section. Add more sections, then publish.</p>
          <label className="mt-5 block text-[13px] font-medium">
            Title
            <input name="title" required value={title} onChange={(e) => (setTitle(e.target.value), !touched && setSlug(auto(e.target.value)))} className={cn(field, "mt-1.5")} />
            {err.title && <span className="mt-1 block text-[12px] text-red-700">{err.title}</span>}
          </label>
          <label className="mt-4 block text-[13px] font-medium">
            Address
            <div className="mt-1.5 flex items-center rounded-lg border border-ws-line focus-within:border-ws-ink/50">
              <span className="pl-3 font-mono text-[13px] text-ws-ink/45">/</span>
              <input name="slug" required value={slug} onChange={(e) => (setTouched(true), setSlug(e.target.value))} className="w-full rounded-lg px-1 py-2 font-mono text-[13px] outline-none" />
            </div>
            {err.slug && <span className="mt-1 block text-[12px] text-red-700">{err.slug}</span>}
          </label>
          {state && !state.ok && !state.fieldErrors && <p className="mt-3 text-[13px] text-red-700">{state.error}</p>}
          <div className="mt-6 flex justify-end gap-2">
            <Btn onClick={() => ref.current?.close()}>Cancel</Btn>
            <button type="submit" disabled={pending} className="inline-flex h-9 items-center rounded-lg bg-ws-ink px-3.5 text-[13px] font-medium text-white hover:bg-forest disabled:opacity-60">
              {pending ? "Creating…" : "Create page"}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}

/* ─── Page builder ─── */
export function PageBuilder({ page, sections: initial }: { page: PageRow; sections: BuilderSection[] }) {
  const { run, pending } = useAction();
  const router = useRouter();
  const [sections, setSections] = useState(initial);
  useEffect(() => setSections(initial), [initial]);
  const [meta, setMeta] = useState({ title: page.title, slug: page.slug, seo_title: page.seo_title ?? "", seo_description: page.seo_description ?? "" });
  const [metaErr, setMetaErr] = useState<Record<string, string>>({});
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const path = page.slug === "home" ? "/" : `/${page.slug}`;
  const pendingDrafts = sections.filter((s) => s.hasDraft || s.status === "draft").length;

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const next = arrayMove(sections, sections.findIndex((s) => s.id === active.id), sections.findIndex((s) => s.id === over.id));
    setSections(next);
    run(() => reorderSections(page.id, next.map((s) => s.id)), { refresh: false });
  };

  return (
    <>
      <PageHeader
        eyebrow={
          <Link href="/admin/pages" className="inline-flex items-center gap-1 hover:text-ws-ink">
            <ArrowLeft className="h-3 w-3" /> Pages
          </Link>
        }
        title={page.title}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <Badge status={page.status} />
            <span className="font-mono text-[12px]">{path}</span>
            {pendingDrafts > 0 && <Badge status="draft changes">{pendingDrafts} section{pendingDrafts > 1 ? "s" : ""} not yet published</Badge>}
          </span>
        }
        actions={
          <>
            <a href={`/api/preview?path=${encodeURIComponent(path)}`} target="_blank" rel="noopener noreferrer" className="inline-flex h-9 items-center gap-2 rounded-lg border border-ws-line bg-white px-3.5 text-[13px] font-medium hover:border-ws-ink/40">
              <Eye className="h-4 w-4" /> Preview
            </a>
            {page.status === "published" && page.slug !== "home" && (
              <Btn onClick={() => run(() => setPageStatus(page.id, "draft"))} loading={pending}>
                Unpublish
              </Btn>
            )}
            <Btn variant="amber" onClick={() => run(() => publishPage(page.id))} loading={pending}>
              {page.status === "published" ? "Publish all changes" : "Publish page"}
            </Btn>
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_20rem]">
        <Card title={`Sections (${sections.length})`} actions={<AddSection pageId={page.id} />}>
          {sections.length === 0 ? (
            <p className="p-6 text-[13px] text-ws-ink/60">This page has no sections yet. Add one to begin.</p>
          ) : (
            <DndContext id={`sections-${page.id}`} sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
              <SortableContext items={sections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
                <ol className="divide-y divide-ws-line">
                  {sections.map((s, i) => (
                    <SortableSection key={s.id} s={s} index={i} pageId={page.id} path={path} onRemoved={() => setSections((x) => x.filter((y) => y.id !== s.id))} />
                  ))}
                </ol>
              </SortableContext>
            </DndContext>
          )}
          <p className="border-t border-ws-line px-5 py-3 text-[12px] text-ws-ink/50">Drag the handle (or focus it and use the arrow keys) to reorder. Order and visibility changes apply immediately; content edits stay as drafts until published.</p>
        </Card>

        <div className="space-y-6">
          <Card title="Page settings & SEO">
            <div className="space-y-4 p-5">
              <label className="block text-[13px] font-medium">
                Title
                <input className={cn(field, "mt-1.5")} value={meta.title} onChange={(e) => setMeta({ ...meta, title: e.target.value })} />
                {metaErr.title && <span className="mt-1 block text-[12px] text-red-700">{metaErr.title}</span>}
              </label>
              <label className="block text-[13px] font-medium">
                Address
                <input className={cn(field, "mt-1.5 font-mono text-[13px]", page.is_system && "bg-ws text-ws-ink/50")} value={meta.slug} disabled={page.is_system} onChange={(e) => setMeta({ ...meta, slug: e.target.value })} />
                {page.is_system && <span className="mt-1 block text-[11px] text-ws-ink/50">Built-in page addresses are fixed.</span>}
                {metaErr.slug && <span className="mt-1 block text-[12px] text-red-700">{metaErr.slug}</span>}
              </label>
              <label className="block text-[13px] font-medium">
                SEO title
                <input className={cn(field, "mt-1.5")} value={meta.seo_title} maxLength={120} onChange={(e) => setMeta({ ...meta, seo_title: e.target.value })} />
              </label>
              <label className="block text-[13px] font-medium">
                SEO description
                <textarea className={cn(field, "mt-1.5")} rows={3} value={meta.seo_description} maxLength={300} onChange={(e) => setMeta({ ...meta, seo_description: e.target.value })} />
                <span className="mt-1 block text-right text-[11px] text-ws-ink/45">{meta.seo_description.length}/300</span>
              </label>
              <Btn variant="primary" className="w-full" loading={pending} onClick={() => run(() => savePageMeta(page.id, meta), { onOk: () => setMetaErr({}), onError: (r) => setMetaErr(r.fieldErrors ?? {}) })}>
                Save page settings
              </Btn>
            </div>
          </Card>
          {!page.is_system && (
            <Card title="Danger zone">
              <div className="flex flex-wrap gap-2 p-5">
                {page.status !== "archived" && (
                  <Btn onClick={() => run(() => setPageStatus(page.id, "archived"))} loading={pending}>
                    Archive
                  </Btn>
                )}
                <Confirm
                  title="Delete this page?"
                  body="The page and all of its sections will be permanently deleted. This cannot be undone."
                  onConfirm={() => run(() => deletePage(page.id), { onOk: () => router.push("/admin/pages") })}
                  trigger={(open) => (
                    <Btn variant="danger" onClick={open}>
                      Delete page
                    </Btn>
                  )}
                />
              </div>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}

function SortableSection({ s, index, pageId, path, onRemoved }: { s: BuilderSection; index: number; pageId: string; path: string; onRemoved: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: s.id });
  const { run, pending } = useAction();
  const router = useRouter();
  return (
    <li ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={cn("flex items-center gap-3 bg-white px-3 py-3 sm:px-4", isDragging && "relative z-10 shadow-lg", !s.visible && "opacity-60")}>
      <button type="button" {...attributes} {...listeners} aria-label={`Reorder ${s.typeLabel}`} className="cursor-grab rounded-md p-1.5 text-ws-ink/35 hover:bg-ws hover:text-ws-ink active:cursor-grabbing">
        <GripVertical className="h-4 w-4" />
      </button>
      <span className="w-6 font-mono text-[11px] text-ws-ink/40">{String(index + 1).padStart(2, "0")}</span>
      <Link href={`/admin/pages/${pageId}/sections/${s.id}`} className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2 text-[13px] font-medium">
          {s.label || s.typeLabel}
          {s.label && <span className="text-[11px] font-normal text-ws-ink/45">{s.typeLabel}</span>}
        </p>
        {s.summary && <p className="mt-0.5 truncate text-[12px] text-ws-ink/55">{s.summary}</p>}
      </Link>
      <div className="hidden flex-wrap gap-1 sm:flex">
        {s.status !== "published" && <Badge status={s.status} />}
        {s.hasDraft && <Badge status="draft changes">edited</Badge>}
        {!s.visible && <Badge status="hidden" />}
      </div>
      <div className="flex items-center">
        <Link href={`/admin/pages/${pageId}/sections/${s.id}`} aria-label="Edit" title="Edit" className="rounded-md p-2 text-ws-ink/60 hover:bg-ws hover:text-ws-ink">
          <Pencil className="h-4 w-4" />
        </Link>
        <button type="button" aria-label={s.visible ? "Hide" : "Show"} title={s.visible ? "Hide from the site" : "Show on the site"} disabled={pending} onClick={() => run(() => setSectionVisibility(s.id, !s.visible))} className="rounded-md p-2 text-ws-ink/60 hover:bg-ws hover:text-ws-ink">
          {s.visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
        <button type="button" aria-label="Duplicate" title="Duplicate" disabled={pending} onClick={() => run(() => duplicateSection(s.id))} className="rounded-md p-2 text-ws-ink/60 hover:bg-ws hover:text-ws-ink">
          <Copy className="h-4 w-4" />
        </button>
        <a href={`/api/preview?path=${encodeURIComponent(path)}`} target="_blank" rel="noopener noreferrer" aria-label="Preview page" title="Preview" className="hidden rounded-md p-2 text-ws-ink/60 hover:bg-ws hover:text-ws-ink md:block">
          <Eye className="h-4 w-4" />
        </a>
        <Confirm
          title="Delete this section?"
          body={`“${s.label || s.typeLabel}” will be removed from the page permanently.`}
          onConfirm={() => run(() => deleteSection(s.id), { onOk: () => (onRemoved(), router.refresh()) })}
          trigger={(open) => (
            <button type="button" aria-label="Delete" title="Delete" onClick={open} className="rounded-md p-2 text-ws-ink/60 hover:bg-red-50 hover:text-red-700">
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        />
      </div>
    </li>
  );
}

const GROUPS: SectionGroup[] = ["Signature", "Story", "Engagement", "Data-driven", "Media", "Layout"];

function AddSection({ pageId }: { pageId: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  const { run, pending } = useAction();
  const router = useRouter();
  return (
    <>
      <Btn variant="primary" onClick={() => ref.current?.showModal()} className="h-8">
        <Plus className="h-4 w-4" /> Add section
      </Btn>
      <dialog ref={ref} className="m-auto max-h-[88vh] w-[min(96vw,56rem)] overflow-hidden rounded-2xl border border-ws-line bg-ws p-0 shadow-2xl backdrop:bg-ws-ink/40">
        <header className="flex items-center justify-between border-b border-ws-line bg-white px-6 py-4">
          <div>
            <h2 className="font-serif text-2xl">Add a section</h2>
            <p className="text-[13px] text-ws-ink/60">It is added at the end of the page as a draft. Drag it into place afterwards.</p>
          </div>
          <button type="button" onClick={() => ref.current?.close()} aria-label="Close" className="rounded-md p-2 hover:bg-ws">
            <X className="h-4 w-4" />
          </button>
        </header>
        <div className="max-h-[70vh] overflow-y-auto p-6">
          {GROUPS.map((g) => (
            <div key={g} className="mb-6">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-ws-ink/45">{g}</p>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {sectionTypes
                  .filter((t) => t.group === g)
                  .map((t) => (
                    <button
                      key={t.type}
                      type="button"
                      disabled={pending}
                      onClick={() => run(() => addSection(pageId, t.type), { onOk: (r) => (ref.current?.close(), r.id && router.push(`/admin/pages/${pageId}/sections/${r.id}`)) })}
                      className="rounded-xl border border-ws-line bg-white p-4 text-left transition-colors hover:border-ws-ink/40 disabled:opacity-60"
                    >
                      <p className="text-[13px] font-semibold">{t.label}</p>
                      <p className="mt-1 text-[12px] leading-snug text-ws-ink/60">{t.description}</p>
                      {t.uses && <p className="mt-2 text-[11px] text-forest">Shows: {t.uses}</p>}
                    </button>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </dialog>
    </>
  );
}
