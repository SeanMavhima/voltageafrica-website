"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Reply, Trash2 } from "lucide-react";
import { deleteEngagement, saveEngagementNotes, setEngagementStatus } from "@/lib/cms/actions";
import { engagementStatuses, statusLabels, type EngagementKind, type EngagementStatus } from "@/lib/engagement/config";
import { cn } from "@/lib/utils";
import { Btn, Confirm, useAction, useUnsavedWarning } from "./ui";

const dot: Record<EngagementStatus, string> = {
  new: "bg-sky-500",
  reviewed: "bg-stone-400",
  in_discussion: "bg-amber",
  accepted: "bg-emerald-600",
  declined: "bg-rose-500",
  completed: "bg-forest",
};

/** One-click workflow status, shown as a segmented control. */
export function StatusControl({ kind, id, status }: { kind: EngagementKind; id: string; status: string }) {
  const { run, pending } = useAction();
  const [optimistic, setOptimistic] = useState(status);
  const current = pending ? optimistic : status;
  return (
    <div role="radiogroup" aria-label="Status" className="grid grid-cols-2 gap-1 rounded-lg bg-ws-ink/[0.05] p-1 sm:grid-cols-3 xl:grid-cols-6">
      {engagementStatuses.map((s) => {
        const on = current === s;
        return (
          <button
            key={s}
            type="button"
            role="radio"
            aria-checked={on}
            disabled={pending}
            onClick={() => {
              if (s === status) return;
              setOptimistic(s);
              run(() => setEngagementStatus(kind, id, s));
            }}
            className={cn(
              "flex items-center justify-center gap-2 rounded-md px-2.5 py-2 text-[12.5px] font-medium transition-colors disabled:cursor-wait",
              on ? "bg-white text-ws-ink shadow-sm ring-1 ring-ws-line" : "text-ws-ink/60 hover:bg-white/60 hover:text-ws-ink",
            )}
          >
            <span className={cn("h-1.5 w-1.5 rounded-full", dot[s], !on && "opacity-50")} aria-hidden />
            {statusLabels[s]}
          </button>
        );
      })}
    </div>
  );
}

/** Private notes, visible to administrators only. */
export function NotesEditor({ kind, id, notes }: { kind: EngagementKind; id: string; notes: string }) {
  const [value, setValue] = useState(notes);
  const [saved, setSaved] = useState(notes);
  const { run, pending } = useAction();
  const dirty = value !== saved;
  useUnsavedWarning(dirty);
  return (
    <div>
      <label htmlFor={`notes-${id}`} className="sr-only">
        Private admin notes
      </label>
      <textarea
        id={`notes-${id}`}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={5}
        maxLength={10000}
        placeholder="Add private notes: follow-ups, decisions, who you spoke to…"
        className="w-full resize-y rounded-lg border border-ws-line bg-[#fffdf7] px-3.5 py-3 text-[14px] leading-relaxed text-ws-ink outline-none placeholder:text-ws-ink/35 focus:border-ws-ink/50"
      />
      <div className="mt-2 flex items-center justify-between gap-3">
        <p className="text-[12px] text-ws-ink/50">{dirty ? <span className="font-medium text-amber-ink">Unsaved changes</span> : "Only administrators can see these notes."}</p>
        <Btn variant="primary" loading={pending} disabled={!dirty} onClick={() => run(() => saveEngagementNotes(kind, id, value), { onOk: () => setSaved(value) })}>
          Save notes
        </Btn>
      </div>
    </div>
  );
}

export function SubmissionActions({ kind, id, replyHref, backHref }: { kind: EngagementKind; id: string; replyHref: string; backHref: string }) {
  const { run } = useAction();
  const router = useRouter();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <a href={replyHref} className="inline-flex h-9 items-center gap-2 rounded-lg bg-ws-ink px-3.5 text-[13px] font-medium text-white hover:bg-forest">
        <Reply className="h-4 w-4" aria-hidden /> Reply by email
      </a>
      <Confirm
        title="Delete this submission?"
        body="It will be permanently deleted, including your notes. Mark it Declined or Completed instead if you may need it later."
        onConfirm={() => run(() => deleteEngagement(kind, id), { onOk: () => router.push(backHref) })}
        trigger={(open) => (
          <Btn variant="danger" onClick={open}>
            <Trash2 className="h-3.5 w-3.5" aria-hidden /> Delete
          </Btn>
        )}
      />
    </div>
  );
}
