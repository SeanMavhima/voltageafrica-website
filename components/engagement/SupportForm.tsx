"use client";

import Link from "next/link";
import { useState } from "react";
import { countries } from "@/lib/engagement/countries";
import { currencies, suggestedAmounts, supportAreas, supportFormForType, supportForms, supportTypes } from "@/lib/engagement/config";
import { supportSchema } from "@/lib/validation/engagement";
import { cn } from "@/lib/utils";
import { ChoiceGroup, ConsentField, FormAlert, Honeypot, SelectField, SubmitButton, SuccessPanel, TextArea, TextField, useEngagementForm, type FormCopy } from "./FormKit";

const collect = (fd: FormData) => ({
  fullName: String(fd.get("fullName") ?? ""),
  email: String(fd.get("email") ?? ""),
  country: String(fd.get("country") ?? ""),
  supportType: String(fd.get("supportType") ?? ""),
  supportForm: String(fd.get("supportForm") ?? ""),
  amount: String(fd.get("amount") ?? ""),
  currency: String(fd.get("currency") ?? ""),
  supportArea: String(fd.get("supportArea") ?? ""),
  message: String(fd.get("message") ?? ""),
  consent: fd.get("consent") === "on",
});

export function SupportForm({ copy, consentLabel, paymentNote }: { copy: FormCopy; consentLabel: string; paymentNote: string }) {
  const f = useEngagementForm({ endpoint: "/api/support", schema: supportSchema, collect });
  const [type, setType] = useState("");
  const [form, setForm] = useState("");
  const [amount, setAmount] = useState("");
  const e = f.errors;

  if (f.status.state === "sent") {
    return (
      <SuccessPanel
        title={copy.successTitle}
        message={copy.successMessage}
        nextStep={copy.nextStep}
        againLabel="Submit another inquiry"
        onAgain={() => {
          setType("");
          setForm("");
          setAmount("");
          f.reset();
        }}
        statusRef={f.statusRef}
      />
    );
  }

  const financial = form === "financial";

  return (
    <form onSubmit={f.onSubmit} onChange={f.onChange} noValidate className="relative grid gap-x-10 gap-y-9 sm:grid-cols-2" aria-label="Support inquiry">
      <TextField name="fullName" label="Full name" autoComplete="name" maxLength={120} error={e.fullName} />
      <TextField name="email" type="email" label="Email" autoComplete="email" inputMode="email" maxLength={200} error={e.email} />
      <TextField name="country" label="Country" autoComplete="country-name" list="support-countries" maxLength={80} error={e.country} className="sm:col-span-2" />
      <datalist id="support-countries">
        {countries.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>

      <ChoiceGroup
        name="supportType"
        legend="Support type"
        options={supportTypes}
        columns={3}
        value={type}
        onChange={(v) => {
          setType(v);
          setForm(supportFormForType[v as keyof typeof supportFormForType] ?? "");
        }}
        error={e.supportType}
        className="sm:col-span-2"
      />
      <ChoiceGroup name="supportForm" legend="Form of support" options={supportForms} columns={4} value={form} onChange={setForm} error={e.supportForm} className="sm:col-span-2" />

      <fieldset className="grid gap-x-10 gap-y-6 sm:col-span-2 sm:grid-cols-[1fr_12rem]">
        <legend className="sr-only">Proposed contribution</legend>
        <div>
          <TextField
            name="amount"
            label={financial ? "Contribution amount" : "Estimated value"}
            optional
            inputMode="decimal"
            autoComplete="off"
            maxLength={20}
            placeholder="Any amount"
            value={amount}
            onChange={(ev) => setAmount(ev.target.value.replace(/[^\d.,\s]/g, ""))}
            error={e.amount}
            hint={financial ? "Choose a suggestion or enter your own amount." : "If useful, an approximate value of the equipment or services."}
          />
          {financial && (
            <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Suggested amounts">
              {suggestedAmounts.map((a) => {
                const on = amount.replace(/[\s,]/g, "") === String(a);
                return (
                  <button
                    key={a}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setAmount(String(a))}
                    className={cn("min-h-10 border px-4 text-sm font-medium tabular-nums transition-colors", on ? "border-charcoal bg-charcoal text-parchment" : "border-charcoal/25 text-charcoal-2 hover:border-charcoal")}
                  >
                    {a.toLocaleString("en-GB")}
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <SelectField name="currency" label="Currency" optional placeholder="—" options={currencies} error={e.currency} />
      </fieldset>

      <SelectField name="supportArea" label="Intended area of support" options={supportAreas} error={e.supportArea} className="sm:col-span-2" />
      <TextArea name="message" label="Message" maxLength={4000} rows={5} className="sm:col-span-2" placeholder="Tell us what you would like to contribute and anything we should know." error={e.message} />
      <div className="sm:col-span-2">
        <ConsentField label={consentLabel} error={e.consent} />
      </div>
      <Honeypot />
      <p className="border-l-2 border-amber bg-amber-soft/40 px-4 py-3 text-[0.9375rem] leading-relaxed text-charcoal-2 sm:col-span-2">{paymentNote}</p>
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
