"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { ArrowRight, Check, CircleAlert, LoaderCircle } from "lucide-react";
import type { z } from "zod";
import type { LinkValue } from "@/lib/cms/types";
import { fieldErrors } from "@/lib/validation/engagement";
import { cn } from "@/lib/utils";

/* ═════════════════════════ Submission state ═════════════════════════ */

type Status = { state: "idle" } | { state: "sending" } | { state: "sent" } | { state: "error"; message: string };
export type Errors = Record<string, string>;

/**
 * Client half of an engagement form: validates with the shared Zod schema,
 * blocks repeat submissions while one is in flight, posts JSON to the API
 * and exposes the resulting state.
 */
export function useEngagementForm({ endpoint, schema, collect }: { endpoint: string; schema: z.ZodType; collect: (fd: FormData) => Record<string, unknown> }) {
  const [status, setStatus] = useState<Status>({ state: "idle" });
  const [errors, setErrors] = useState<Errors>({});
  const inFlight = useRef(false);
  const attempted = useRef(false);
  const startedAt = useRef(0);
  const statusRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    startedAt.current = Date.now();
  }, []);

  const focusFirst = (form: HTMLFormElement, errs: Errors) => {
    const el = Array.from(form.elements).find((x) => (x as HTMLInputElement).name && errs[(x as HTMLInputElement).name]) as HTMLElement | undefined;
    el?.focus();
  };

  /** After a first attempt, re-validate as the visitor corrects fields. */
  const onChange = (e: React.FormEvent<HTMLFormElement>) => {
    if (!attempted.current) return;
    const r = schema.safeParse(collect(new FormData(e.currentTarget)));
    setErrors(r.success ? {} : fieldErrors(r.error));
  };

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (inFlight.current) return; // repeated clicks / Enter presses
    const form = e.currentTarget;
    const values = collect(new FormData(form));
    attempted.current = true;
    const local = schema.safeParse(values);
    if (!local.success) {
      const errs = fieldErrors(local.error);
      setErrors(errs);
      setStatus({ state: "idle" });
      focusFirst(form, errs);
      return;
    }
    inFlight.current = true;
    setErrors({});
    setStatus({ state: "sending" });
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, nickname: String(new FormData(form).get("nickname") ?? ""), startedAt: startedAt.current }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; fieldErrors?: Errors };
      if (res.ok && data.ok) {
        setStatus({ state: "sent" });
        form.reset();
        attempted.current = false;
      } else {
        if (data.fieldErrors) {
          setErrors(data.fieldErrors);
          focusFirst(form, data.fieldErrors);
        }
        setStatus({ state: "error", message: data.error || "Something went wrong. Please try again." });
      }
    } catch {
      setStatus({ state: "error", message: "We couldn't reach the server. Check your connection and try again." });
    } finally {
      inFlight.current = false;
    }
    requestAnimationFrame(() => statusRef.current?.focus());
  }

  const reset = () => {
    startedAt.current = Date.now();
    setStatus({ state: "idle" });
  };

  return { status, errors, onSubmit, onChange, reset, statusRef, sending: status.state === "sending" };
}

/* ═════════════════════════ Fields ═════════════════════════ */

const control =
  "peer w-full border-0 border-b border-charcoal/25 bg-transparent px-0 py-3 text-[1.0625rem] text-charcoal outline-none transition-colors placeholder:text-stone-2 focus:border-charcoal/60 focus-visible:outline-none aria-[invalid=true]:border-[#b3361b]";

function Frame({ id, label, optional, hint, error, className, children }: { id: string; label: ReactNode; optional?: boolean; hint?: ReactNode; error?: string; className?: string; children: ReactNode }) {
  return (
    <div className={cn("group relative", className)}>
      <label htmlFor={id} className="kicker block text-[0.6875rem] text-stone transition-colors group-focus-within:text-amber-ink">
        {label}
        {optional && <span className="ml-1.5 font-normal normal-case tracking-normal text-stone-2">(optional)</span>}
      </label>
      <div className="relative">
        {children}
        <span aria-hidden className="pointer-events-none absolute bottom-0 left-0 h-[2px] w-full origin-left scale-x-0 bg-amber transition-transform duration-500 ease-[var(--ease-expo)] group-focus-within:scale-x-100" />
      </div>
      {error ? (
        <p id={`${id}-error`} className="mt-2 flex items-start gap-1.5 text-sm text-[#a3311a]">
          <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden /> {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-2 text-[13px] leading-snug text-stone">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

const describedBy = (id: string, error?: string, hint?: ReactNode) => (error ? `${id}-error` : hint ? `${id}-hint` : undefined);

type Common = { name: string; label: ReactNode; optional?: boolean; hint?: ReactNode; error?: string; className?: string };

export function TextField({ name, label, optional, hint, error, className, ...rest }: Common & Omit<InputHTMLAttributes<HTMLInputElement>, "name">) {
  const id = `${useId()}-${name}`;
  return (
    <Frame id={id} label={label} optional={optional} hint={hint} error={error} className={className}>
      <input id={id} name={name} required={!optional} aria-invalid={!!error} aria-describedby={describedBy(id, error, hint)} className={control} {...rest} />
    </Frame>
  );
}

export function TextArea({ name, label, optional, hint, error, className, ...rest }: Common & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "name">) {
  const id = `${useId()}-${name}`;
  return (
    <Frame id={id} label={label} optional={optional} hint={hint} error={error} className={className}>
      <textarea id={id} name={name} required={!optional} rows={5} aria-invalid={!!error} aria-describedby={describedBy(id, error, hint)} className={cn(control, "min-h-32 resize-y leading-relaxed")} {...rest} />
    </Frame>
  );
}

const chevron =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' fill='none' stroke='%23625d51' stroke-width='1.4'/%3E%3C/svg%3E\")";

export function SelectField({ name, label, optional, hint, error, className, options, placeholder = "Select one", ...rest }: Common & Omit<SelectHTMLAttributes<HTMLSelectElement>, "name"> & { options: readonly (string | { value: string; label: string })[]; placeholder?: string }) {
  const id = `${useId()}-${name}`;
  return (
    <Frame id={id} label={label} optional={optional} hint={hint} error={error} className={className}>
      <select
        id={id}
        name={name}
        required={!optional}
        defaultValue=""
        aria-invalid={!!error}
        aria-describedby={describedBy(id, error, hint)}
        className={cn(control, "cursor-pointer appearance-none bg-[length:12px] bg-[right_0.25rem_center] bg-no-repeat pr-8")}
        style={{ backgroundImage: chevron }}
        {...rest}
      >
        <option value="" disabled={!optional} className="bg-paper">
          {placeholder}
        </option>
        {options.map((o) => {
          const v = typeof o === "string" ? { value: o, label: o } : o;
          return (
            <option key={v.value} value={v.value} className="bg-paper">
              {v.label}
            </option>
          );
        })}
      </select>
    </Frame>
  );
}

/** Radio choices drawn as ruled tiles. */
export function ChoiceGroup({
  name,
  legend,
  options,
  error,
  value,
  onChange,
  columns = 2,
  optional,
  className,
}: {
  name: string;
  legend: ReactNode;
  options: readonly (string | { value: string; label: string })[];
  error?: string;
  value?: string;
  onChange?: (v: string) => void;
  columns?: 2 | 3 | 4;
  optional?: boolean;
  className?: string;
}) {
  const id = `${useId()}-${name}`;
  return (
    <fieldset className={cn("min-w-0", className)} aria-describedby={error ? `${id}-error` : undefined} aria-invalid={!!error}>
      <legend className="kicker mb-3 text-[0.6875rem] text-stone">
        {legend}
        {optional && <span className="ml-1.5 font-normal normal-case tracking-normal text-stone-2">(optional)</span>}
      </legend>
      <div className={cn("grid gap-px border border-rule bg-rule", columns === 2 ? "grid-cols-1 sm:grid-cols-2" : columns === 3 ? "grid-cols-1 sm:grid-cols-3" : "grid-cols-2 sm:grid-cols-4")}>
        {options.map((o) => {
          const v = typeof o === "string" ? { value: o, label: o } : o;
          const controlled = value !== undefined;
          return (
            <label key={v.value} className="group/choice relative flex min-h-12 cursor-pointer items-center gap-3 bg-paper px-4 py-3 text-[0.9375rem] text-charcoal-2 transition-colors hover:bg-parchment has-[:checked]:bg-charcoal has-[:checked]:text-parchment has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-amber-ink">
              <input
                type="radio"
                name={name}
                value={v.value}
                className="peer sr-only"
                {...(controlled ? { checked: value === v.value, onChange: () => onChange?.(v.value) } : {})}
              />
              <span aria-hidden className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-charcoal/35 transition-colors peer-checked:border-amber peer-checked:bg-amber">
                <span className="h-1.5 w-1.5 rounded-full bg-charcoal opacity-0 transition-opacity group-has-[:checked]/choice:opacity-100" />
              </span>
              <span className="leading-snug">{v.label}</span>
            </label>
          );
        })}
      </div>
      {error && (
        <p id={`${id}-error`} className="mt-2 flex items-start gap-1.5 text-sm text-[#a3311a]">
          <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden /> {error}
        </p>
      )}
    </fieldset>
  );
}

export function ConsentField({ name = "consent", label, error }: { name?: string; label: ReactNode; error?: string }) {
  const id = `${useId()}-${name}`;
  return (
    <div>
      <label htmlFor={id} className="flex cursor-pointer items-start gap-3.5 text-[0.9375rem] leading-relaxed text-charcoal-2">
        <span className="relative mt-0.5 flex h-5 w-5 shrink-0">
          <input id={id} name={name} type="checkbox" required aria-invalid={!!error} aria-describedby={error ? `${id}-error` : undefined} className="peer h-5 w-5 cursor-pointer appearance-none border border-charcoal/40 bg-paper transition-colors checked:border-charcoal checked:bg-charcoal aria-[invalid=true]:border-[#b3361b]" />
          <Check className="pointer-events-none absolute inset-0 m-auto h-3.5 w-3.5 text-amber opacity-0 transition-opacity peer-checked:opacity-100" aria-hidden />
        </span>
        <span>{label}</span>
      </label>
      {error && (
        <p id={`${id}-error`} className="ml-[2.125rem] mt-2 flex items-start gap-1.5 text-sm text-[#a3311a]">
          <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden /> {error}
        </p>
      )}
    </div>
  );
}

/** Hidden from people (and assistive tech), tempting to bots. */
export function Honeypot() {
  return (
    <div className="absolute -left-[9999px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
      <label htmlFor="nickname-hp">Leave this field empty</label>
      <input id="nickname-hp" name="nickname" type="text" tabIndex={-1} autoComplete="off" defaultValue="" />
    </div>
  );
}

/* ═════════════════════════ Actions & states ═════════════════════════ */

export function SubmitButton({ sending, label, sendingLabel = "Sending" }: { sending: boolean; label: string; sendingLabel?: string }) {
  return (
    <button
      type="submit"
      disabled={sending}
      aria-disabled={sending}
      className="group relative inline-flex min-h-14 w-full items-center justify-between gap-5 bg-charcoal pl-7 pr-2 text-[0.9375rem] font-medium text-parchment transition-colors duration-300 hover:bg-forest disabled:cursor-wait disabled:opacity-80 sm:w-auto sm:justify-start"
    >
      <span aria-live="polite">{sending ? sendingLabel : label}</span>
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-amber text-charcoal">
        {sending ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden /> : <ArrowRight className="h-4 w-4 transition-transform duration-500 ease-[var(--ease-expo)] group-hover:translate-x-0.5" aria-hidden />}
      </span>
    </button>
  );
}

export function FormAlert({ status, statusRef }: { status: Status; statusRef: React.RefObject<HTMLDivElement | null> }) {
  return (
    <div ref={statusRef} tabIndex={-1} className="outline-none">
      {status.state === "error" && (
        <p role="alert" className="flex items-start gap-3 border-l-2 border-[#b3361b] bg-[#b3361b]/[0.06] p-4 text-[0.9375rem] leading-relaxed text-[#8f2a14]">
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          {status.message}
        </p>
      )}
    </div>
  );
}

export function SuccessPanel({ title, message, nextStep, againLabel, onAgain, statusRef }: { title: string; message: string; nextStep: LinkValue | null; againLabel: string; onAgain: () => void; statusRef: React.RefObject<HTMLDivElement | null> }) {
  return (
    <div ref={statusRef} tabIndex={-1} role="status" className="flex min-h-[26rem] flex-col justify-center outline-none motion-safe:animate-[fade-up_0.8s_var(--ease-expo)_both]">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-forest text-amber">
        <Check className="h-5 w-5" aria-hidden />
      </span>
      <p className="display mt-8 text-[clamp(2.4rem,4vw,3.4rem)] text-charcoal">{title}</p>
      <p className="mt-5 max-w-[46ch] text-lg leading-relaxed text-charcoal-2">{message}</p>
      <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4">
        {nextStep && (
          <Link href={nextStep.href} className="group inline-flex min-h-12 items-center gap-4 bg-charcoal pl-6 pr-2 text-[0.9375rem] font-medium text-parchment transition-colors hover:bg-forest">
            {nextStep.label}
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-amber text-charcoal">
              <ArrowRight className="h-4 w-4" aria-hidden />
            </span>
          </Link>
        )}
        <button type="button" onClick={onAgain} className="text-sm font-medium text-charcoal underline decoration-rule-strong underline-offset-4 hover:decoration-charcoal">
          {againLabel}
        </button>
      </div>
    </div>
  );
}

/** Shared copy passed from the CMS to every form. */
export type FormCopy = {
  submitLabel: string;
  successTitle: string;
  successMessage: string;
  nextStep: LinkValue | null;
  privacyNote: string;
};
