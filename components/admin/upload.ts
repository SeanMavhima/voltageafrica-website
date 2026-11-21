"use client";

import { createBrowserSupabase } from "@/lib/supabase/browser";
import { mediaUrl } from "@/lib/supabase/env";
import { registerMedia } from "@/lib/cms/actions";

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"];
const VIDEO_TYPES = ["video/mp4", "video/webm"];
const DOC_TYPES = ["application/pdf"];
export const ACCEPT = [...IMAGE_TYPES, ...VIDEO_TYPES, ...DOC_TYPES].join(",");
const MAX_BYTES = 50 * 1024 * 1024;
const MAX_EDGE = 3840;

export const CATEGORIES = ["general", "brand", "homepage", "founder", "projects", "publications", "awards", "timeline", "microgrid"];

const safeName = (name: string) =>
  name
    .toLowerCase()
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "file";

/** Downscale very large raster images in the browser before upload; returns dimensions too. */
async function prepareImage(file: File): Promise<{ blob: Blob; width: number; height: number; type: string; ext: string }> {
  const bitmap = await createImageBitmap(file);
  const { width, height } = bitmap;
  const tooBig = Math.max(width, height) > MAX_EDGE || file.size > 8 * 1024 * 1024;
  const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase();
  if (!tooBig || file.type === "image/gif") {
    bitmap.close();
    return { blob: file, width, height, type: file.type, ext };
  }
  const scale = Math.min(1, MAX_EDGE / Math.max(width, height));
  const w = Math.round(width * scale);
  const h = Math.round(height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  const type = file.type === "image/png" ? "image/png" : "image/jpeg";
  const blob = await new Promise<Blob>((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("Could not process image"))), type, 0.88));
  return { blob, width: w, height: h, type, ext: type === "image/png" ? "png" : "jpg" };
}

export type UploadOutcome = { ok: true; id: string; src: string; alt: string; mime: string } | { ok: false; error: string };

export async function uploadMedia(file: File, opts: { category: string; alt?: string; privateBucket?: boolean }): Promise<UploadOutcome> {
  const allowed = [...IMAGE_TYPES, ...VIDEO_TYPES, ...DOC_TYPES];
  if (!allowed.includes(file.type)) return { ok: false, error: `${file.name}: this file type isn't supported. Use JPG, PNG, WebP, AVIF, GIF, MP4, WebM or PDF.` };
  if (file.size > MAX_BYTES) return { ok: false, error: `${file.name} is larger than 50 MB.` };

  let blob: Blob = file;
  let width: number | null = null;
  let height: number | null = null;
  let type = file.type;
  let ext = (file.name.split(".").pop() ?? "bin").toLowerCase();
  if (IMAGE_TYPES.includes(file.type)) {
    try {
      const p = await prepareImage(file);
      ({ blob, width, height, type, ext } = p);
    } catch {
      return { ok: false, error: `${file.name} could not be read as an image.` };
    }
  }

  const bucket = opts.privateBucket ? "private" : "media";
  const category = CATEGORIES.includes(opts.category) ? opts.category : "general";
  const path = `${category}/${crypto.randomUUID().slice(0, 8)}-${safeName(file.name)}.${ext}`;
  const supabase = createBrowserSupabase();
  const { error } = await supabase.storage.from(bucket).upload(path, blob, { contentType: type, cacheControl: "31536000", upsert: false });
  if (error) return { ok: false, error: `${file.name}: ${error.message}` };

  const res = await registerMedia({ bucket, path, file_name: file.name.slice(0, 255), mime_type: type, size_bytes: blob.size, width, height, category, alt_text: opts.alt ?? "" });
  if (!res.ok) {
    await supabase.storage.from(bucket).remove([path]);
    return { ok: false, error: res.error };
  }
  return { ok: true, id: res.id!, src: mediaUrl(bucket, path), alt: opts.alt ?? "", mime: type };
}
