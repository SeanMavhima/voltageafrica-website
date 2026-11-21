"use client";

import Link from "next/link";
import { contactCategories } from "@/lib/engagement/config";
import { contactSchema } from "@/lib/validation/engagement";
import { FormAlert, Honeypot, SelectField, SubmitButton, SuccessPanel, TextArea, TextField, useEngagementForm, type FormCopy } from "@/components/engagement/FormKit";

const collect = (fd: FormData) => ({
  name: String(fd.get("name") ?? ""),
  email: String(fd.get("email") ?? ""),
  subject: String(fd.get("subject") ?? ""),
  inquiry: String(fd.get("inquiry") ?? ""),
  message: String(fd.get("message") ?? ""),
});

export function ContactForm({ copy }: { copy: FormCopy }) {
  const f = useEngagementForm({ endpoint: "/api/contact", schema: contactSchema, collect });
  const e = f.errors;

  if (f.status.state === "sent") {
    return <SuccessPanel title={copy.successTitle} message={copy.successMessage} nextStep={copy.nextStep} againLabel="Send another message" onAgain={f.reset} statusRef={f.statusRef} />;
  }

  return (
    <form onSubmit={f.onSubmit} onChange={f.onChange} noValidate className="relative grid gap-x-10 gap-y-9 sm:grid-cols-2" aria-label="Contact form">
      <TextField name="name" label="Full name" autoComplete="name" maxLength={120} error={e.name} />
      <TextField name="email" type="email" label="Email address" autoComplete="email" inputMode="email" maxLength={200} error={e.email} />
      <TextField name="subject" label="Subject" maxLength={200} error={e.subject} />
      <SelectField name="inquiry" label="Inquiry category" options={contactCategories} error={e.inquiry} />
      <TextArea name="message" label="Message" maxLength={4000} rows={6} className="sm:col-span-2" error={e.message} />
      <Honeypot />
      <div className="flex flex-col gap-6 sm:col-span-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-[44ch] text-[13px] leading-relaxed text-stone">
          {copy.privacyNote}{" "}
          <Link href="/privacy" className="font-medium text-charcoal underline decoration-rule-strong underline-offset-4 hover:decoration-charcoal">
            Privacy policy
          </Link>
        </p>
        <SubmitButton sending={f.sending} label={copy.submitLabel} />
      </div>
      <div className="sm:col-span-2">
        <FormAlert status={f.status} statusRef={f.statusRef} />
      </div>
    </form>
  );
}
