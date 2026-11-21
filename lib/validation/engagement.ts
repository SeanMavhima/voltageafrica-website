/**
 * Zod schemas for the three public engagement forms. Used by the browser for
 * instant feedback and, authoritatively, by the API routes on the server.
 */
import { z } from "zod";
import { contactCategories, currencies, partnershipCategories, supportAreas, supportForms, supportTypes } from "@/lib/engagement/config";
import { clean } from "./contact";

const req = (message: string, min: number, max: number, tooLong: string, multiline = false) =>
  z
    .string({ error: message })
    .transform((v) => clean(v, multiline))
    .pipe(z.string().min(min, message).max(max, tooLong));

const opt = (max: number, tooLong: string) =>
  z
    .string()
    .nullish()
    .transform((v) => clean(v ?? ""))
    .pipe(z.string().max(max, tooLong));

const fullName = req("Please enter your full name.", 2, 120, "Name is too long (120 characters max).");
const email = z
  .string({ error: "Please enter a valid email address." })
  .transform((v) => clean(v).toLowerCase())
  .pipe(z.email("Please enter a valid email address.").max(200, "Email address is too long."));
const country = req("Please tell us your country.", 2, 80, "Country name is too long.");
const consent = z.literal(true, { error: "Please confirm that we may contact you about this inquiry." });

/** Spam signals: a hidden honeypot field and the time the form was opened. */
const spam = {
  nickname: z.string().nullish(),
  startedAt: z.coerce.number().optional(),
};

const choice = <T extends readonly [string, ...string[]]>(values: T, message: string) =>
  z.enum(values, { error: message });

/* ─── Partner with us ─── */

const website = z
  .string()
  .nullish()
  .transform((v, ctx) => {
    const s = clean(v ?? "");
    if (!s) return null;
    const withScheme = /^https?:\/\//i.test(s) ? s : `https://${s}`;
    try {
      const u = new URL(withScheme);
      if (!/^https?:$/.test(u.protocol) || !u.hostname.includes(".") || withScheme.length > 300) throw new Error();
      return u.toString();
    } catch {
      ctx.addIssue({ code: "custom", message: "Please enter a full website or LinkedIn address." });
      return z.NEVER;
    }
  });

const phone = opt(40, "Phone number is too long.").refine((v) => v === "" || /^[+()\d\s./-]{6,40}$/.test(v), "Please enter a valid phone number, including the country code.");

export const partnershipSchema = z.object({
  fullName,
  organisation: req("Please enter your organisation (or 'Independent').", 1, 160, "Organisation name is too long."),
  email,
  phone,
  country,
  category: choice(partnershipCategories, "Please choose a partnership category."),
  proposal: req("Please describe the area of collaboration in a few words.", 3, 300, "Please keep this to 300 characters; use the message for detail."),
  message: req("Please write a short message (at least 20 characters).", 20, 4000, "Message is too long (4,000 characters max).", true),
  website,
  consent,
  ...spam,
});
export type PartnershipInput = z.infer<typeof partnershipSchema>;

/* ─── Support / contribute ─── */

const amount = z
  .union([z.number(), z.string()])
  .nullish()
  .transform((v, ctx) => {
    if (v === null || v === undefined || v === "") return null;
    const n = typeof v === "number" ? v : Number(clean(v).replace(/[\s,]/g, ""));
    if (!Number.isFinite(n) || n <= 0) {
      ctx.addIssue({ code: "custom", message: "Enter an amount greater than zero, or leave it empty." });
      return z.NEVER;
    }
    if (n > 1_000_000_000_000) {
      ctx.addIssue({ code: "custom", message: "That amount is too large. Leave it empty and tell us in your message." });
      return z.NEVER;
    }
    return Math.round(n * 100) / 100;
  });

export const supportSchema = z
  .object({
    fullName,
    email,
    country,
    supportType: choice(supportTypes, "Please choose how you would like to support us."),
    supportForm: choice(supportForms.map((f) => f.value) as unknown as readonly [string, ...string[]], "Please choose the form your support would take."),
    amount,
    currency: z
      .union([z.enum(currencies), z.literal("")])
      .nullish()
      .transform((v) => v || null),
    supportArea: choice(supportAreas, "Please choose the area you would like to support."),
    message: req("Please add a short message (at least 10 characters).", 10, 4000, "Message is too long (4,000 characters max).", true),
    consent,
    ...spam,
  })
  .superRefine((d, ctx) => {
    if (d.amount !== null && !d.currency) ctx.addIssue({ code: "custom", path: ["currency"], message: "Choose a currency for the amount." });
  });
export type SupportInput = z.infer<typeof supportSchema>;

/* ─── Contact ─── */

export const contactSchema = z.object({
  name: fullName,
  email,
  subject: req("Please add a subject.", 2, 200, "Subject is too long (200 characters max)."),
  inquiry: choice(contactCategories, "Please choose an inquiry category."),
  message: req("Please write at least a couple of sentences (20+ characters).", 20, 4000, "Message is too long (4,000 characters max).", true),
  ...spam,
});
export type ContactInput = z.infer<typeof contactSchema>;

/** Flatten Zod issues into { field: first message }. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const k = String(issue.path[0] ?? "form");
    if (!out[k]) out[k] = issue.message;
  }
  return out;
}
