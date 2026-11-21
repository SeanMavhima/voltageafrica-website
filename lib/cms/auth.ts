import "server-only";
import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createSessionClient } from "@/lib/supabase/server";

export type AdminContext = {
  db: Awaited<ReturnType<typeof createSessionClient>>;
  user: { id: string; email: string };
  role: "admin" | "editor";
};

/** For server actions: returns the admin context or null (never throws/redirects). */
export async function getAdmin(): Promise<AdminContext | null> {
  if (!isSupabaseConfigured) return null;
  const db = await createSessionClient();
  const {
    data: { user },
  } = await db.auth.getUser(); // verifies the JWT with Supabase Auth, not just the cookie
  if (!user) return null;
  const { data: profile } = await db.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!profile) return null;
  return { db, user: { id: user.id, email: user.email ?? "" }, role: profile.role as AdminContext["role"] };
}

/** For admin pages: redirects to login (or the setup screen) when not an administrator. */
export async function requireAdmin(next?: string): Promise<AdminContext> {
  if (!isSupabaseConfigured) redirect("/admin/login");
  const admin = await getAdmin();
  if (!admin) redirect(`/admin/login${next ? `?next=${encodeURIComponent(next)}` : ""}`);
  return admin;
}
