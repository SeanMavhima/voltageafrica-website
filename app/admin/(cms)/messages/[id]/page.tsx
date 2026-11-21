import { redirect } from "next/navigation";

/** Contact messages now live in the Engagement Inbox. */
export default async function MessagePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(/^[0-9a-f-]{36}$/i.test(id) ? `/admin/engagement?tab=contact&id=${id}` : "/admin/engagement?tab=contact");
}
