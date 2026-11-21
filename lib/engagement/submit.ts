import "server-only";
import { createHash } from "node:crypto";
import { after, NextResponse, type NextRequest } from "next/server";
import type { z } from "zod";
import { emailProviderConfigured, envNotificationRecipient, sendAdminNotification, type AdminNotification } from "@/lib/email";
import { rateLimit } from "@/lib/rate-limit";
import { site } from "@/lib/site";
import { createServiceClient } from "@/lib/supabase/service";
import { contactSchema, fieldErrors, partnershipSchema, supportSchema, type ContactInput, type PartnershipInput, type SupportInput } from "@/lib/validation/engagement";
import { adminInboxPath, formatAmount, kinds, supportForms, type EngagementKind } from "./config";

const MIN_FILL_MS = 3_000; // people take longer than this to complete a form
const MAX_BODY = 20_000;
const DUPLICATE_WINDOW_MS = 10 * 60_000;

type Service = NonNullable<ReturnType<typeof createServiceClient>>;
type Prepared = { row: Record<string, unknown>; notification: Omit<AdminNotification, "submittedAt" | "adminUrl"> };

const definitions = {
  partnerships: {
    schema: partnershipSchema,
    prepare: (d: PartnershipInput): Prepared => ({
      row: {
        full_name: d.fullName,
        organisation: d.organisation,
        email: d.email,
        phone: d.phone || null,
        country: d.country,
        category: d.category,
        proposal: d.proposal,
        message: d.message,
        website: d.website,
        consent: true,
      },
      notification: {
        category: "Partnership request",
        subject: `${d.fullName} (${d.organisation})`,
        name: d.fullName,
        email: d.email,
        organisation: d.organisation,
        details: [
          ["Category", d.category],
          ["Country", d.country],
          ["Phone", d.phone],
          ["Website", d.website],
        ],
        blocks: [
          ["Area of collaboration", d.proposal],
          ["Message", d.message],
        ],
      },
    }),
  },
  support: {
    schema: supportSchema,
    prepare: (d: SupportInput): Prepared => ({
      row: {
        full_name: d.fullName,
        email: d.email,
        country: d.country,
        support_type: d.supportType,
        support_form: d.supportForm,
        amount: d.amount,
        currency: d.amount === null ? null : d.currency,
        support_area: d.supportArea,
        message: d.message,
        consent: true,
      },
      notification: {
        category: "Support inquiry",
        subject: `${d.fullName}, ${d.supportType.toLowerCase()}`,
        name: d.fullName,
        email: d.email,
        details: [
          ["Support type", d.supportType],
          ["Form of support", supportForms.find((f) => f.value === d.supportForm)?.label],
          ["Proposed amount", formatAmount(d.amount, d.currency)],
          ["Area of support", d.supportArea],
          ["Country", d.country],
        ],
        blocks: [["Message", d.message]],
      },
    }),
  },
  contact: {
    schema: contactSchema,
    prepare: (d: ContactInput): Prepared => ({
      row: { name: d.name, email: d.email, subject: d.subject, inquiry: d.inquiry, message: d.message },
      notification: {
        category: "Contact message",
        subject: `${d.subject} (${d.name})`,
        name: d.name,
        email: d.email,
        details: [["Category", d.inquiry], ["Subject", d.subject]],
        blocks: [["Message", d.message]],
      },
    }),
  },
} satisfies Record<EngagementKind, { schema: z.ZodType; prepare: (d: never) => Prepared }>;

const json = (body: Record<string, unknown>, status = 200, headers?: Record<string, string>) => NextResponse.json(body, { status, headers });

function clientIp(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
}

/** CSRF defence: only same-origin JSON requests are accepted. */
function isSameOrigin(req: NextRequest): boolean {
  if (req.headers.get("sec-fetch-site") === "cross-site") return false;
  const origin = req.headers.get("origin");
  if (!origin) return true; // non-browser clients; still rate-limited and validated
  try {
    const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

async function recipientFor(service: Service | null, kind: EngagementKind): Promise<{ to: string | null; enabled: boolean }> {
  const fallback = envNotificationRecipient();
  if (!service) return { to: fallback, enabled: true };
  const { data, error } = await service.from("admin_settings").select("notification_email, notify_partnership, notify_support, notify_contact").eq("id", 1).maybeSingle();
  if (error || !data) return { to: fallback, enabled: true };
  return { to: (data.notification_email as string | null) || fallback, enabled: data[kinds[kind].notifyFlag] !== false };
}

async function notify(service: Service | null, kind: EngagementKind, n: AdminNotification) {
  const { to, enabled } = await recipientFor(service, kind);
  if (!enabled) return { ok: true as const, mode: "dev-log" as const };
  const result = await sendAdminNotification(n, to);
  if (!result.ok && result.reason === "provider-error") console.error(`[engagement] Notification for ${kind} could not be sent (submission is safely stored if storage succeeded).`);
  return result;
}

export async function handleEngagementSubmission(req: NextRequest, kind: EngagementKind) {
  if (!isSameOrigin(req)) return json({ ok: false, error: "This form can only be submitted from the VoltageAfrica website." }, 403);
  if (!(req.headers.get("content-type") ?? "").includes("application/json")) return json({ ok: false, error: "Invalid request." }, 415);

  const ip = clientIp(req);
  const perForm = rateLimit(`${kind}:${ip}`, 5, 10 * 60_000);
  const overall = rateLimit(`engagement:${ip}`, 12, 60 * 60_000);
  if (!perForm.ok || !overall.ok) {
    const retry = Math.max(perForm.retryAfter, overall.retryAfter);
    return json({ ok: false, error: "Too many submissions from this connection. Please try again a little later." }, 429, { "Retry-After": String(retry) });
  }

  const raw = await req.text();
  if (raw.length > MAX_BODY) return json({ ok: false, error: "Your submission is too long. Please shorten your message." }, 413);
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return json({ ok: false, error: "Invalid request." }, 400);
  }

  const def = definitions[kind];
  const parsed = def.schema.safeParse(body);
  if (!parsed.success) return json({ ok: false, error: "Please check the highlighted fields.", fieldErrors: fieldErrors(parsed.error) }, 422);
  const data = parsed.data as { nickname?: string | null; startedAt?: number };

  // Honeypot filled or impossibly fast: pretend success so bots learn nothing.
  if (data.nickname || (data.startedAt && Date.now() - data.startedAt < MIN_FILL_MS)) return json({ ok: true });

  const { row, notification } = (def.prepare as (d: unknown) => Prepared)(parsed.data);
  const table = kinds[kind].table;
  const service = createServiceClient();
  const submittedAt = new Date();

  // 1) Store first. This is the record of truth.
  let storedId: string | null = null;
  if (service) {
    // A repeated submission (double click, resubmitted tab) is acknowledged, not duplicated.
    const since = new Date(Date.now() - DUPLICATE_WINDOW_MS).toISOString();
    const dup = await service.from(table).select("id").eq("email", row.email as string).eq("message", row.message as string).gte("created_at", since).limit(1);
    if (!dup.error && dup.data?.length) return json({ ok: true, duplicate: true });

    const salt = process.env.IP_HASH_SALT || process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(-12) || "";
    const ipHash = createHash("sha256").update(`${ip}:${salt}`).digest("hex").slice(0, 32);
    const { data: inserted, error } = await service.from(table).insert({ ...row, ip_hash: ipHash }).select("id").single();
    if (error) console.error(`[engagement] Could not store ${kind} submission:`, error.code, error.message);
    else storedId = inserted.id as string;
  } else {
    console.error("[engagement] SUPABASE_SERVICE_ROLE_KEY is not set; submissions cannot be stored.");
  }

  const full: AdminNotification = { ...notification, submittedAt, adminUrl: storedId ? `${site.url}${adminInboxPath(kind, storedId)}` : null };

  // 2) Notify. When the record is stored, email runs after the response and can never fail the submission.
  if (storedId) {
    after(() => notify(service, kind, full).catch((e) => console.error("[engagement] notification error", e)));
    return json({ ok: true });
  }

  // Storage unavailable: the email becomes the only record, so wait for it.
  const result = emailProviderConfigured() ? await notify(service, kind, full) : ({ ok: false, reason: "not-configured" } as const);
  if (result.ok && result.mode === "resend") return json({ ok: true });
  return json({ ok: false, error: "We couldn't receive your submission just now. Please try again shortly, or email us directly." }, 503);
}

export function methodNotAllowed() {
  return json({ ok: false, error: "Method not allowed." }, 405, { Allow: "POST" });
}
