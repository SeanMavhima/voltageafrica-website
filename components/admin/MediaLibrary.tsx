"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, FileText, Film, Lock, LoaderCircle, Search, Upload, X } from "lucide-react";
import { deleteMedia, updateMedia } from "@/lib/cms/actions";
import { cn } from "@/lib/utils";
import { Btn, Card, Confirm, EmptyState, PageHeader, useAction, useToast } from "./ui";
import { ACCEPT, CATEGORIES, uploadMedia } from "./upload";

export type LibraryItem = {
  id: string;
  bucket: string;
  path: string;
  src: string;
  publicUrl: string | null;
  file_name: string;
  title: string;
  alt_text: string;
  description: string;
  caption: string;
  category: string;
  credit_author: string;
  credit_license: string;
  credit_license_url: string;
  credit_source: string;
  mime_type: string;
  size_bytes: number | null;
  width: number | null;
  height: number | null;
  created_at: string;
};

const kb = (n: number | null) => (n == null ? "" : n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.round(n / 1024)} KB`);
const field = "mt-1 w-full rounded-lg border border-ws-line bg-white px-3 py-2 text-[13px] outline-none focus:border-ws-ink/50";

export function MediaLibrary({ items }: { items: LibraryItem[] }) {
  const router = useRouter();
  const toast = useToast();
  const [q, setQ] = useState("");
  const [type, setType] = useState("all");
  const [cat, setCat] = useState("all");
  const [selected, setSelected] = useState<string | null>(null);
  const [uploading, setUploading] = useState(0);
  const [uploadCat, setUploadCat] = useState("general");
  const [priv, setPriv] = useState(false);

  const filtered = useMemo(
    () =>
      items.filter((m) => {
        if (type === "image" && !m.mime_type.startsWith("image/")) return false;
        if (type === "video" && !m.mime_type.startsWith("video/")) return false;
        if (type === "document" && m.mime_type !== "application/pdf") return false;
        if (type === "private" && m.bucket !== "private") return false;
        if (cat !== "all" && m.category !== cat) return false;
        const t = q.trim().toLowerCase();
        return !t || [m.title, m.alt_text, m.file_name, m.description, m.caption].some((x) => x?.toLowerCase().includes(t));
      }),
    [items, q, type, cat],
  );
  const current = items.find((m) => m.id === selected) ?? null;
  const categories = [...new Set([...CATEGORIES, ...items.map((i) => i.category)])];

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    const list = Array.from(files);
    setUploading(list.length);
    let ok = 0;
    for (const f of list) {
      const r = await uploadMedia(f, { category: uploadCat, privateBucket: priv });
      if (r.ok) ok++;
      else toast({ kind: "error", text: r.error });
      setUploading((n) => n - 1);
    }
    if (ok) toast({ kind: "success", text: `${ok} file${ok > 1 ? "s" : ""} uploaded. Remember to add alt text.` });
    router.refresh();
  }

  return (
    <>
      <PageHeader
        title="Media library"
        description="Upload once, reuse anywhere. Public files are served to the website; private files are only visible here, through expiring links."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <select value={uploadCat} onChange={(e) => setUploadCat(e.target.value)} aria-label="Category for new uploads" className="h-9 rounded-lg border border-ws-line bg-white px-2 text-[13px]">
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <label className="flex h-9 items-center gap-2 rounded-lg border border-ws-line bg-white px-3 text-[13px]">
              <input type="checkbox" checked={priv} onChange={(e) => setPriv(e.target.checked)} className="accent-[#344b3b]" /> Private
            </label>
            <label className={cn("inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg bg-ws-ink px-3.5 text-[13px] font-medium text-white hover:bg-forest", uploading > 0 && "pointer-events-none opacity-70")}>
              {uploading > 0 ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {uploading > 0 ? `Uploading ${uploading}…` : "Upload files"}
              <input type="file" multiple accept={ACCEPT} className="sr-only" onChange={(e) => onFiles(e.target.files)} />
            </label>
          </div>
        }
      />

      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          onFiles(e.dataTransfer.files);
        }}
        className="grid gap-6 xl:grid-cols-[1fr_22rem]"
      >
        <Card>
          <div className="flex flex-wrap items-center gap-3 border-b border-ws-line px-4 py-3">
            <div className="relative flex-1 sm:max-w-xs">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-ws-ink/40" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, alt text or caption" aria-label="Search media" className="h-9 w-full rounded-lg border border-ws-line pl-8 pr-3 text-[13px] outline-none focus:border-ws-ink/50" />
            </div>
            <select value={type} onChange={(e) => setType(e.target.value)} aria-label="Filter by type" className="h-9 rounded-lg border border-ws-line bg-white px-2 text-[13px]">
              <option value="all">All types</option>
              <option value="image">Images</option>
              <option value="video">Videos</option>
              <option value="document">Documents</option>
              <option value="private">Private</option>
            </select>
            <select value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Filter by category" className="h-9 rounded-lg border border-ws-line bg-white px-2 text-[13px]">
              <option value="all">All categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <span className="ml-auto text-[12px] text-ws-ink/50">{filtered.length} files · drop files anywhere here to upload</span>
          </div>
          {filtered.length === 0 ? (
            <EmptyState title="No media found" body="Upload images, videos or PDFs, or change the filters." />
          ) : (
            <ul className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 lg:grid-cols-4">
              {filtered.map((m) => (
                <li key={m.id}>
                  <button type="button" onClick={() => setSelected(m.id)} aria-pressed={selected === m.id} className={cn("group block w-full overflow-hidden rounded-lg border bg-white text-left transition-colors", selected === m.id ? "border-ws-ink ring-2 ring-amber" : "border-ws-line hover:border-ws-ink/40")}>
                    <div className="relative aspect-[4/3] bg-ws">
                      <Thumb m={m} />
                      {!m.alt_text && m.mime_type.startsWith("image/") && <span className="absolute left-2 top-2 rounded bg-amber px-1.5 py-0.5 text-[10px] font-semibold text-ws-ink">No alt text</span>}
                      {m.bucket === "private" && <Lock className="absolute right-2 top-2 h-4 w-4 text-white drop-shadow" />}
                    </div>
                    <div className="px-2.5 py-2">
                      <p className="truncate text-[12px] font-medium">{m.title || m.file_name}</p>
                      <p className="truncate text-[11px] text-ws-ink/50">
                        {m.category}
                        {m.width ? ` · ${m.width}×${m.height}` : ""}
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div className="xl:sticky xl:top-6 xl:self-start">{current ? <Details key={current.id} m={current} onClose={() => setSelected(null)} /> : <Card title="Details"><p className="p-5 text-[13px] text-ws-ink/60">Select a file to edit its alt text, caption, category and credit.</p></Card>}</div>
      </div>
    </>
  );
}

function Thumb({ m }: { m: LibraryItem }) {
  if (m.mime_type.startsWith("video/")) return <div className="flex h-full items-center justify-center text-ws-ink/40"><Film className="h-8 w-8" /></div>;
  if (m.mime_type === "application/pdf") return <div className="flex h-full items-center justify-center text-ws-ink/40"><FileText className="h-8 w-8" /></div>;
  // eslint-disable-next-line @next/next/no-img-element
  return m.src ? <img src={m.src} alt="" loading="lazy" className="h-full w-full object-cover" /> : null;
}

function Details({ m, onClose }: { m: LibraryItem; onClose: () => void }) {
  const { run, pending } = useAction();
  const toast = useToast();
  const [v, setV] = useState({ title: m.title, alt_text: m.alt_text, description: m.description, caption: m.caption, category: m.category, credit_author: m.credit_author, credit_license: m.credit_license, credit_license_url: m.credit_license_url, credit_source: m.credit_source });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [forceMsg, setForceMsg] = useState<string | null>(null);
  useEffect(() => setForceMsg(null), [m.id]);
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setV({ ...v, [k]: e.target.value });
  const url = m.publicUrl ? (m.publicUrl.startsWith("/") ? `${window.location.origin}${m.publicUrl}` : m.publicUrl) : null;

  return (
    <Card
      title="Details"
      actions={
        <button type="button" onClick={onClose} aria-label="Close details" className="rounded-md p-1 text-ws-ink/50 hover:bg-ws">
          <X className="h-4 w-4" />
        </button>
      }
    >
      <div className="space-y-4 p-5">
        <div className="overflow-hidden rounded-lg bg-ws">
          {m.mime_type.startsWith("video/") ? (
            <video src={m.src} controls className="w-full" />
          ) : m.mime_type.startsWith("image/") ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={m.src} alt="" className="max-h-56 w-full object-contain" />
          ) : (
            <a href={m.src} target="_blank" rel="noopener noreferrer" className="block p-6 text-center text-[13px] underline">
              Open document
            </a>
          )}
        </div>
        <p className="text-[11px] leading-relaxed text-ws-ink/55">
          {m.file_name} · {m.mime_type} {m.size_bytes ? `· ${kb(m.size_bytes)}` : ""} {m.width ? `· ${m.width}×${m.height}px` : ""}
          <br />
          {m.bucket === "static" ? "Bundled with the website" : m.bucket === "private" ? "Private storage (links expire after one hour)" : "Public storage"}
        </p>
        {url && (
          <Btn className="w-full" onClick={() => navigator.clipboard.writeText(url).then(() => toast({ kind: "success", text: "URL copied." }))}>
            <Copy className="h-4 w-4" /> Copy URL
          </Btn>
        )}
        <label className="block text-[12px] font-medium">
          Title
          <input className={field} value={v.title} onChange={set("title")} />
        </label>
        <label className="block text-[12px] font-medium">
          Alt text
          <textarea className={field} rows={2} value={v.alt_text} onChange={set("alt_text")} placeholder="Describe what the image shows" />
        </label>
        <label className="block text-[12px] font-medium">
          Caption
          <input className={field} value={v.caption} onChange={set("caption")} />
        </label>
        <label className="block text-[12px] font-medium">
          Description (internal)
          <textarea className={field} rows={2} value={v.description} onChange={set("description")} />
        </label>
        <label className="block text-[12px] font-medium">
          Category
          <select className={field} value={v.category} onChange={set("category")}>
            {[...new Set([...CATEGORIES, v.category])].map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <details className="rounded-lg border border-ws-line p-3 text-[12px]">
          <summary className="cursor-pointer font-medium">Photo credit (for licensed images)</summary>
          <div className="mt-3 space-y-3">
            <label className="block">
              Photographer
              <input className={field} value={v.credit_author} onChange={set("credit_author")} />
            </label>
            <label className="block">
              Licence
              <input className={field} value={v.credit_license} onChange={set("credit_license")} placeholder="e.g. CC BY-SA 4.0" />
            </label>
            <label className="block">
              Licence link
              <input className={field} value={v.credit_license_url} onChange={set("credit_license_url")} />
              {errors.credit_license_url && <span className="text-red-700">{errors.credit_license_url}</span>}
            </label>
            <label className="block">
              Source link
              <input className={field} value={v.credit_source} onChange={set("credit_source")} />
              {errors.credit_source && <span className="text-red-700">{errors.credit_source}</span>}
            </label>
          </div>
        </details>
        <Btn variant="primary" className="w-full" loading={pending} onClick={() => run(() => updateMedia(m.id, v), { onOk: () => setErrors({}), onError: (r) => setErrors(r.fieldErrors ?? {}) })}>
          Save details
        </Btn>
        {forceMsg ? (
          <div className="rounded-lg bg-red-50 p-3 text-[12px] text-red-800">
            <p>{forceMsg}</p>
            <Btn variant="danger" className="mt-2 w-full" loading={pending} onClick={() => run(() => deleteMedia(m.id, true), { onOk: onClose })}>
              Delete anyway
            </Btn>
          </div>
        ) : (
          <Confirm
            title="Delete this file?"
            body="It will be removed from the library and from storage."
            onConfirm={() => run(() => deleteMedia(m.id), { onOk: onClose, onError: (r) => setForceMsg(r.error) })}
            trigger={(open) => (
              <Btn variant="danger" className="w-full" onClick={open}>
                Delete
              </Btn>
            )}
          />
        )}
      </div>
    </Card>
  );
}
