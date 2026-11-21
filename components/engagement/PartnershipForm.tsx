"use client";

import Link from "next/link";
import { countries } from "@/lib/engagement/countries";
import { partnershipCategories } from "@/lib/engagement/config";
import { partnershipSchema } from "@/lib/validation/engagement";
import { ConsentField, FormAlert, Honeypot, SelectField, SubmitButton, SuccessPanel, TextArea, TextField, useEngagementForm, type FormCopy } from "./FormKit";

const collect = (fd: FormData) => ({
  fullName: String(fd.get("fullName") ?? ""),
  organisation: String(fd.get("organisation") ?? ""),
  email: String(fd.get("email") ?? ""),
  phone: String(fd.get("phone") ?? ""),
  country: String(fd.get("country") ?? ""),
  category: String(fd.get("category") ?? ""),
  proposal: String(fd.get("proposal") ?? ""),
  message: String(fd.get("message") ?? ""),
  website: String(fd.get("website") ?? ""),
  consent: fd.get("consent") === "on",
});

export function PartnershipForm({ copy, consentLabel }: { copy: FormCopy; consentLabel: string }) {
  const f = useEngagementForm({ endpoint: "/api/partnership", schema: partnershipSchema, collect });
  const e = f.errors;

  if (f.status.state === "sent") {
    return <SuccessPanel title={copy.successTitle} message={copy.successMessage} nextStep={copy.nextStep} againLabel="Send another inquiry" onAgain={f.reset} statusRef={f.statusRef} />;
  }

  return (
    <form onSubmit={f.onSubmit} onChange={f.onChange} noValidate className="relative grid gap-x-10 gap-y-9 sm:grid-cols-2" aria-label="Partnership inquiry">
      <TextField name="fullName" label="Full name" autoComplete="name" maxLength={120} error={e.fullName} />
      <TextField name="organisation" label="Organisation" autoComplete="organization" maxLength={160} error={e.organisation} hint="Individual collaborator? Write “Independent”." />
      <TextField name="email" type="email" label="Email address" autoComplete="email" inputMode="email" maxLength={200} error={e.email} />
      <TextField name="phone" type="tel" label="Phone number" optional autoComplete="tel" inputMode="tel" maxLength={40} placeholder="+263 …" error={e.phone} />
      <TextField name="country" label="Country" autoComplete="country-name" list="partner-countries" maxLength={80} error={e.country} />
      <datalist id="partner-countries">
        {countries.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>
      <SelectField name="category" label="Partnership category" options={partnershipCategories} error={e.category} />
      <TextField name="proposal" label="Partnership proposal / area of collaboration" maxLength={300} className="sm:col-span-2" placeholder="e.g. Battery storage for the Shurugwi pilot hub" error={e.proposal} />
      <TextArea name="message" label="Message" maxLength={4000} rows={6} className="sm:col-span-2" placeholder="Tell us about your organisation and what you have in mind." error={e.message} />
      <TextField name="website" type="url" label="Website or LinkedIn" optional autoComplete="url" inputMode="url" maxLength={300} placeholder="https://" className="sm:col-span-2" error={e.website} />
      <div className="sm:col-span-2">
        <ConsentField label={consentLabel} error={e.consent} />
      </div>
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
