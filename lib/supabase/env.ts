/** Supabase configuration. Only NEXT_PUBLIC_* values may reach the browser. */
export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "") ?? "";
export const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

/** Public URL for a media asset. Static seed files live in /public; uploads in Storage. */
export function mediaUrl(bucket: string, path: string): string {
  if (bucket === "static" || path.startsWith("/") || /^https?:\/\//.test(path)) return path;
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${path.split("/").map(encodeURIComponent).join("/")}`;
}
