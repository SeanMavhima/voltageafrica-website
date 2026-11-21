"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Copy, GripVertical, Plus, Search, Trash2 } from "lucide-react";
import { deleteCollectionItem, duplicateCollectionItem, reorderCollection, setCollectionStatus } from "@/lib/cms/actions";
import { collections, type CollectionKey } from "@/lib/cms/collections";
import { cn } from "@/lib/utils";
import { Badge, Btn, Card, Confirm, EmptyState, PageHeader, useAction } from "./ui";

type Row = Record<string, unknown> & { id: string; thumb?: string | null };

export function CollectionList({ collectionKey, rows: initial, filterValue }: { collectionKey: CollectionKey; rows: Record<string, unknown>[]; filterValue?: string }) {
  const def = collections[collectionKey];
  const router = useRouter();
  const { run } = useAction();
  const [rows, setRows] = useState(initial as Row[]);
  useEffect(() => setRows(initial as Row[]), [initial]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  const filtered = useMemo(
    () =>
      rows.filter((r) => {
        if (status !== "all" && def.hasStatus && r.status !== status) return false;
        if (!q.trim()) return true;
        const t = q.toLowerCase();
        return def.searchFields.some((f) => String(r[f] ?? "").toLowerCase().includes(t));
      }),
    [rows, q, status, def],
  );
  const canReorder = !q.trim() && status === "all";
  const base = `/admin/${collectionKey}`;
  const newHref = `${base}/new${def.filter && filterValue ? `?${def.filter.field}=${filterValue}` : ""}`;

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const next = arrayMove(rows, rows.findIndex((r) => r.id === active.id), rows.findIndex((r) => r.id === over.id));
    setRows(next);
    run(() => reorderCollection(collectionKey, next.map((r) => r.id)), { refresh: false });
  };

  return (
    <>
      <PageHeader
        title={def.label}
        description={def.description}
        actions={
          <Link href={newHref} className="inline-flex h-9 items-center gap-2 rounded-lg bg-ws-ink px-3.5 text-[13px] font-medium text-white hover:bg-forest">
            <Plus className="h-4 w-4" /> Add {def.singular.toLowerCase()}
          </Link>
        }
      />
      {def.filter && (
        <div className="mb-4 flex flex-wrap gap-1 rounded-lg bg-ws-ink/[0.06] p-1 text-[13px] font-medium sm:w-fit">
          {def.filter.options.map((o) => (
            <Link key={o.value} href={`${base}?${def.filter!.field}=${o.value}`} className={cn("rounded-md px-3 py-1.5", filterValue === o.value ? "bg-white shadow-sm" : "text-ws-ink/60 hover:text-ws-ink")}>
              {o.label}
            </Link>
          ))}
        </div>
      )}
      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-ws-line px-4 py-3">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-ws-ink/40" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${def.label.toLowerCase()}`} aria-label="Search" className="h-9 w-full rounded-lg border border-ws-line pl-8 pr-3 text-[13px] outline-none focus:border-ws-ink/50" />
          </div>
          {def.hasStatus && (
            <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status" className="h-9 rounded-lg border border-ws-line bg-white px-2 text-[13px]">
              <option value="all">All statuses</option>
              <option value="published">Published</option>
              <option value="draft">Drafts</option>
              <option value="archived">Archived</option>
            </select>
          )}
          <span className="ml-auto text-[12px] text-ws-ink/50">
            {filtered.length} of {rows.length}
            {!canReorder && rows.length > 1 && " · clear search to reorder"}
          </span>
        </div>
        {filtered.length === 0 ? (
          <EmptyState
            title={rows.length ? "Nothing matches your search." : `No ${def.label.toLowerCase()} yet.`}
            action={
              !rows.length && (
                <Link href={newHref} className="inline-flex h-9 items-center gap-2 rounded-lg bg-ws-ink px-3.5 text-[13px] font-medium text-white">
                  <Plus className="h-4 w-4" /> Add the first one
                </Link>
              )
            }
          />
        ) : (
          <DndContext id={`list-${collectionKey}`} sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={filtered.map((r) => r.id)} strategy={verticalListSortingStrategy}>
              <ul className="divide-y divide-ws-line">
                {filtered.map((r) => (
                  <ItemRow key={r.id} row={r} collectionKey={collectionKey} canReorder={canReorder} onRemoved={() => setRows((x) => x.filter((y) => y.id !== r.id))} onDuplicated={(id) => router.push(`${base}/${id}`)} />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        )}
      </Card>
    </>
  );
}

function ItemRow({ row, collectionKey, canReorder, onRemoved, onDuplicated }: { row: Row; collectionKey: CollectionKey; canReorder: boolean; onRemoved: () => void; onDuplicated: (id: string) => void }) {
  const def = collections[collectionKey];
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: row.id, disabled: !canReorder });
  const { run, pending } = useAction();
  const href = `/admin/${collectionKey}/${row.id}`;
  const title = String(row[def.titleField] ?? "Untitled");
  const secondary = def.columns.filter(([k]) => k !== def.titleField).map(([k]) => row[k]).filter((v) => v !== null && v !== undefined && v !== "");
  const status = def.hasStatus ? String(row.status) : row.is_visible === false ? "hidden" : null;
  return (
    <li ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={cn("flex items-center gap-3 bg-white px-3 py-3 sm:px-4", isDragging && "relative z-10 shadow-lg")}>
      <button type="button" {...attributes} {...listeners} disabled={!canReorder} aria-label={`Reorder ${title}`} className="cursor-grab rounded-md p-1.5 text-ws-ink/35 hover:bg-ws disabled:cursor-default disabled:opacity-30">
        <GripVertical className="h-4 w-4" />
      </button>
      {row.thumb !== undefined && (
        <div className="hidden h-10 w-14 shrink-0 overflow-hidden rounded-md bg-ws sm:block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {row.thumb && <img src={row.thumb} alt="" className="h-full w-full object-cover" loading="lazy" />}
        </div>
      )}
      <Link href={href} className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium">{title}</p>
        {secondary.length > 0 && <p className="mt-0.5 truncate text-[12px] text-ws-ink/55">{secondary.map(String).join(" · ")}</p>}
      </Link>
      {Boolean(row.is_upcoming) && <Badge status="new">upcoming</Badge>}
      {Boolean(row.is_founder) && <Badge status="published">founder</Badge>}
      {status && <Badge status={status} />}
      <div className="flex items-center">
        {def.hasStatus && row.status !== "published" && (
          <Btn variant="ghost" className="h-8 px-2.5" loading={pending} onClick={() => run(() => setCollectionStatus(collectionKey, row.id, "published"))}>
            Publish
          </Btn>
        )}
        <button type="button" aria-label="Duplicate" title="Duplicate" disabled={pending} onClick={() => run(() => duplicateCollectionItem(collectionKey, row.id), { onOk: (r) => r.id && onDuplicated(r.id) })} className="rounded-md p-2 text-ws-ink/60 hover:bg-ws hover:text-ws-ink">
          <Copy className="h-4 w-4" />
        </button>
        <Confirm
          title={`Delete this ${def.singular.toLowerCase()}?`}
          body={`“${title}” will be permanently deleted.${def.hasStatus ? " To hide it without deleting, archive it instead." : ""}`}
          onConfirm={() => run(() => deleteCollectionItem(collectionKey, row.id), { onOk: onRemoved })}
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
