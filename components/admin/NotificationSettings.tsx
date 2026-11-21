"use client";

import { useMemo, useState } from "react";
import { saveNotificationSettings } from "@/lib/cms/actions";
import type { Field } from "@/lib/cms/fields";
import { FieldsForm } from "./FieldsForm";
import { Btn, Card, useAction } from "./ui";

const fields: Field[] = [
  {
    name: "notification_email",
    label: "Notification recipient",
    kind: "text",
    max: 200,
    help: "Where new partnership, support and contact submissions are emailed. Private: never shown on the website. Leave empty to use the ADMIN_NOTIFICATION_EMAIL (or CONTACT_TO_EMAIL) environment variable.",
  },
  { name: "notify_partnership", label: "Email me new partnership requests", kind: "boolean" },
  { name: "notify_support", label: "Email me new support inquiries", kind: "boolean" },
  { name: "notify_contact", label: "Email me new contact messages", kind: "boolean" },
];

export function NotificationSettings({ initial, ready, providerConfigured, envRecipient }: { initial: Record<string, unknown>; ready: boolean; providerConfigured: boolean; envRecipient: boolean }) {
  const [values, setValues] = useState(initial);
  const [saved, setSaved] = useState(JSON.stringify(initial));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { run, pending } = useAction();
  const dirty = useMemo(() => JSON.stringify(values) !== saved, [values, saved]);
  const hasRecipient = Boolean(values.notification_email) || envRecipient;

  return (
    <Card
      title="Engagement notifications"
      className="mt-6"
      actions={
        ready && (
          <Btn variant="amber" loading={pending} disabled={!dirty} onClick={() => run(() => saveNotificationSettings(values), { onOk: () => (setSaved(JSON.stringify(values)), setErrors({})), onError: (r) => setErrors(r.fieldErrors ?? {}) })}>
            Save notifications
          </Btn>
        )
      }
    >
      <div className="grid gap-6 p-5 lg:grid-cols-[1fr_18rem]">
        {ready ? (
          <FieldsForm fields={fields} values={values} onChange={setValues} errors={errors} />
        ) : (
          <p className="text-[13px] text-ws-ink/70">Run the engagement migration (supabase/migrations/20261120000004_engagement.sql) to configure notifications here.</p>
        )}
        <div className="space-y-2 rounded-lg bg-ws p-4 text-[12.5px] leading-relaxed">
          <p className="font-semibold text-ws-ink">Delivery status</p>
          <p className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${providerConfigured ? "bg-emerald-600" : "bg-amber"}`} aria-hidden />
            Email provider (Resend): {providerConfigured ? "configured" : "not configured"}
          </p>
          <p className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${hasRecipient ? "bg-emerald-600" : "bg-amber"}`} aria-hidden />
            Recipient: {values.notification_email ? "set above" : envRecipient ? "from environment variable" : "not set"}
          </p>
          <p className="pt-1 text-ws-ink/60">
            Submissions are always saved to the Engagement Inbox first. If email is not configured or fails, nothing is lost.
            {!providerConfigured && " To enable email, set RESEND_API_KEY and NOTIFICATION_FROM_EMAIL in your hosting environment."}
          </p>
        </div>
      </div>
    </Card>
  );
}
