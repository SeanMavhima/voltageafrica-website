import { Sidebar } from "@/components/admin/Sidebar";
import { requireAdmin } from "@/lib/cms/auth";
import { engagementCounts } from "@/lib/engagement/admin";

export const dynamic = "force-dynamic";

export default async function CmsLayout({ children }: { children: React.ReactNode }) {
  const { db, user } = await requireAdmin();
  const counts = await engagementCounts(db);
  return (
    <>
      <Sidebar email={user.email} unread={counts.newTotal} />
      <main id="main" className="lg:pl-64">
        <div className="mx-auto max-w-[1180px] px-4 py-8 sm:px-8 lg:py-10">{children}</div>
      </main>
    </>
  );
}
