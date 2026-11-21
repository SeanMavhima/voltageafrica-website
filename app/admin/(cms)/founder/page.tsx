import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/cms/auth";

/** Shortcut to the founder's profile (the person marked as founder), or the team list. */
export default async function FounderShortcut() {
  const { db } = await requireAdmin("/admin/founder");
  const { data } = await db.from("people").select("id").eq("is_founder", true).maybeSingle();
  redirect(data?.id ? `/admin/people/${data.id}` : "/admin/people");
}
