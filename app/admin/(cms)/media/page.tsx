import { MediaLibrary, type LibraryItem } from "@/components/admin/MediaLibrary";
import { requireAdmin } from "@/lib/cms/auth";
import { mediaUrl } from "@/lib/supabase/env";

export const metadata = { title: "Media library" };

export default async function MediaPage() {
  const { db } = await requireAdmin("/admin/media");
  const { data } = await db.from("media_assets").select("*").order("created_at", { ascending: false });
  const rows = data ?? [];
  const privatePaths = rows.filter((r) => r.bucket === "private").map((r) => r.path as string);
  const signed = new Map<string, string>();
  if (privatePaths.length) {
    const { data: urls } = await db.storage.from("private").createSignedUrls(privatePaths, 60 * 60);
    (urls ?? []).forEach((u) => u.signedUrl && u.path && signed.set(u.path, u.signedUrl));
  }
  const items: LibraryItem[] = rows.map((r) => ({
    id: r.id as string,
    bucket: r.bucket as string,
    path: r.path as string,
    src: r.bucket === "private" ? signed.get(r.path as string) ?? "" : mediaUrl(r.bucket as string, r.path as string),
    publicUrl: r.bucket === "private" ? null : mediaUrl(r.bucket as string, r.path as string),
    file_name: r.file_name as string,
    title: (r.title as string) ?? "",
    alt_text: (r.alt_text as string) ?? "",
    description: (r.description as string) ?? "",
    caption: (r.caption as string) ?? "",
    category: r.category as string,
    credit_author: (r.credit_author as string) ?? "",
    credit_license: (r.credit_license as string) ?? "",
    credit_license_url: (r.credit_license_url as string) ?? "",
    credit_source: (r.credit_source as string) ?? "",
    mime_type: (r.mime_type as string) ?? "",
    size_bytes: (r.size_bytes as number) ?? null,
    width: (r.width as number) ?? null,
    height: (r.height as number) ?? null,
    created_at: r.created_at as string,
  }));
  return <MediaLibrary items={items} />;
}
