import { redirect } from "next/navigation";
import { EmptyState, PageHeader } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/cms/auth";

export const metadata = { title: "Homepage" };

/** The homepage is a page like any other; this shortcut opens its builder. */
export default async function Homepage() {
  const { db } = await requireAdmin("/admin/homepage");
  const { data } = await db.from("pages").select("id").eq("slug", "home").maybeSingle();
  if (data?.id) redirect(`/admin/pages/${data.id}`);
  return (
    <>
      <PageHeader title="Homepage" />
      <EmptyState title="No homepage found" body="Run supabase/seed.sql to install the homepage and its sections." />
    </>
  );
}
