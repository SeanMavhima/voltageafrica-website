import { redirect } from "next/navigation";

/** Contact messages now live in the Engagement Inbox. */
export default function Messages() {
  redirect("/admin/engagement?tab=contact");
}
