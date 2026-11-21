import { NotificationSettings } from "@/components/admin/NotificationSettings";
import { SettingsForm } from "@/components/admin/SettingsForm";
import { requireAdmin } from "@/lib/cms/auth";
import { emailProviderConfigured, envNotificationRecipient } from "@/lib/email";

export const metadata = { title: "Site settings" };

export default async function SettingsPage() {
  const { db } = await requireAdmin("/admin/settings");
  const [{ data }, notify] = await Promise.all([
    db.from("site_settings").select("*").eq("id", 1).maybeSingle(),
    db.from("admin_settings").select("notification_email, notify_partnership, notify_support, notify_contact").eq("id", 1).maybeSingle(),
  ]);
  const n = (notify.data ?? {}) as Record<string, unknown>;
  return (
    <>
      <SettingsForm initial={(data ?? {}) as Record<string, unknown>} />
      <NotificationSettings
        ready={!notify.error && !!notify.data}
        providerConfigured={emailProviderConfigured()}
        envRecipient={Boolean(envNotificationRecipient())}
        initial={{
          notification_email: (n.notification_email as string) ?? "",
          notify_partnership: n.notify_partnership !== false,
          notify_support: n.notify_support !== false,
          notify_contact: n.notify_contact !== false,
        }}
      />
    </>
  );
}
