"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ImageIcon, LoaderCircle, Search, Upload, Video, X } from "lucide-react";
import { listMediaForPicker, type PickerItem } from "@/lib/cms/actions";
import type { ImageValue } from "@/lib/cms/fields";
import { cn } from "@/lib/utils";
import { Btn, useToast } from "./ui";
import { ACCEPT, CATEGORIES, uploadMedia } from "./upload";

/** Field control: shows the chosen media and opens the library to pick or upload. */
export function MediaField({ value, onChange, kind = "image", id }: { value: ImageValue | null | undefined; onChange: (v: ImageValue | null) => void; kind?: "image" | "video"; id?: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  return (
    <div>
      {value?.src ? (
        <div className="flex items-start gap-4 rounded-lg border border-ws-line bg-white p-3">
          <div className="relative h-20 w-28 shrink-0 overflow-hidden rounded-md bg-ws">
            {kind === "video" ? (
              <video src={value.src} className="h-full w-full object-cover" muted />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={value.src} alt="" className="h-full w-full object-cover" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <label className="text-[11px] font-medium text-ws-ink/60" htmlFor={id ? `${id}-alt` : undefined}>
              Alt text (describes the image for screen readers)
            </label>
            <input
              id={id ? `${id}-alt` : undefined}
              value={value.alt ?? ""}
              onChange={(e) => onChange({ ...value, alt: e.target.value })}
              className="mt-1 w-full rounded-md border border-ws-line px-2.5 py-1.5 text-[13px] outline-none focus:border-ws-ink/50"
              placeholder="e.g. Solar panels on a school roof at dawn"
            />
            <div className="mt-2 flex gap-2">
              <Btn onClick={() => (setOpen(true), dialog.current?.showModal())} className="h-8">
                Replace
              </Btn>
              <Btn variant="ghost" onClick={() => onChange(null)} className="h-8">
                Remove
              </Btn>
            </div>
          </div>
        </div>
      ) : (
        <button
          id={id}
          type="button"
          onClick={() => (setOpen(true), dialog.current?.showModal())}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-ws-ink/25 bg-white px-4 py-6 text-[13px] text-ws-ink/60 hover:border-ws-ink/50 hover:text-ws-ink"
        >
          {kind === "video" ? <Video className="h-4 w-4" /> : <ImageIcon className="h-4 w-4" />} Choose from the media library or upload
        </button>
      )}
      <dialog ref={dialog} onClose={() => setOpen(false)} className="m-auto h-[min(88vh,52rem)] w-[min(96vw,64rem)] rounded-2xl border border-ws-line bg-ws p-0 shadow-2xl backdrop:bg-ws-ink/40">
        {open && (
          <Library
            kind={kind}
            onPick={(item) => {
              onChange({ id: item.id, src: item.src, alt: item.alt });
              dialog.current?.close();
            }}
            onClose={() => dialog.current?.close()}
          />
        )}
      </dialog>
    </div>
  );
}

function Library({ kind, onPick, onClose }: { kind: "image" | "video"; onPick: (i: PickerItem) => void; onClose: () => void }) {
  const [q, setQ] = useState("");
  const [items, setItems] = useState<PickerItem[] | null>(null);
  const [uploading, setUploading] = useState(false);
  const [category, setCategory] = useState("general");
  const toast = useToast();

  const load = useCallback(async (term: string) => setItems(await listMediaForPicker(term, kind)), [kind]);
  useEffect(() => {
    const t = setTimeout(() => load(q), 250);
    return () => clearTimeout(t);
  }, [q, load]);

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    let last: PickerItem | null = null;
    for (const f of Array.from(files)) {
      const r = await uploadMedia(f, { category });
      if (!r.ok) toast({ kind: "error", text: r.error });
      else last = { id: r.id, src: r.src, alt: "", title: f.name, mime: r.mime, category, width: null, height: null, bucket: "media" };
    }
    setUploading(false);
    if (last) {
      toast({ kind: "success", text: "Uploaded. Add alt text after choosing it." });
      onPick(last);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex flex-wrap items-center gap-3 border-b border-ws-line bg-white px-5 py-3">
        <h2 className="font-serif text-xl text-ws-ink">Media library</h2>
        <div className="relative ml-auto">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-ws-ink/40" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" aria-label="Search media" className="h-9 w-56 rounded-lg border border-ws-line pl-8 pr-3 text-[13px] outline-none focus:border-ws-ink/50" />
        </div>
        <select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Upload category" className="h-9 rounded-lg border border-ws-line bg-white px-2 text-[13px]">
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <label className={cn("inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg bg-ws-ink px-3.5 text-[13px] font-medium text-white hover:bg-forest", uploading && "opacity-60")}>
          {uploading ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />} Upload
          <input type="file" accept={ACCEPT} multiple className="sr-only" disabled={uploading} onChange={(e) => onFiles(e.target.files)} />
        </label>
        <button type="button" onClick={onClose} aria-label="Close" className="rounded-md p-2 text-ws-ink/60 hover:bg-ws-ink/[0.06]">
          <X className="h-4 w-4" />
        </button>
      </header>
      <div className="flex-1 overflow-y-auto p-5">
        {!items ? (
          <div className="flex h-40 items-center justify-center text-ws-ink/50">
            <LoaderCircle className="h-5 w-5 animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <p className="py-16 text-center text-[13px] text-ws-ink/60">No {kind === "video" ? "videos" : "images"} found. Upload one above.</p>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {items.map((m) => (
              <li key={m.id}>
                <button type="button" onClick={() => onPick(m)} className="group block w-full overflow-hidden rounded-lg border border-ws-line bg-white text-left hover:border-ws-ink/50 focus-visible:border-ws-ink">
                  <div className="aspect-[4/3] bg-ws">
                    {m.mime?.startsWith("video/") ? (
                      <video src={m.src} className="h-full w-full object-cover" muted />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={m.src} alt="" loading="lazy" className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                    )}
                  </div>
                  <div className="px-2.5 py-2">
                    <p className="truncate text-[12px] font-medium text-ws-ink">{m.title}</p>
                    <p className="truncate text-[11px] text-ws-ink/50">{m.category}</p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
