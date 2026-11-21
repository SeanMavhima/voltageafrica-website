import "server-only";
import { escapeHtml } from "@/lib/validation/contact";

export type SendResult = { ok: true; id?: string; mode: "resend" | "dev-log" } | { ok: false; reason: "not-configured" | "provider-error" };

export type AdminNotification = {
  /** e.g. "Partnership request" */
  category: string;
  /** Short subject line detail, e.g. the sender's name and organisation. */
  subject: string;
  name: string;
  email: string;
  organisation?: string | null;
  /** Short facts shown as a table. Empty values are skipped. */
  details: [label: string, value: string | null | undefined][];
  /** Longer free-text blocks (proposal, message). */
  blocks: [label: string, value: string | null | undefined][];
  submittedAt: Date;
  /** Absolute link to the submission in the admin dashboard. */
  adminUrl?: string | null;
};

/**
 * Email adapter for admin notifications, delivered through Resend's REST API.
 *
 * Env (server only):
 *   RESEND_API_KEY            secret API key
 *   NOTIFICATION_FROM_EMAIL   verified sender, e.g. "VoltageAfrica <notifications@yourdomain>"
 *                             (CONTACT_FROM_EMAIL is accepted for backwards compatibility)
 *
 * The recipient is resolved by the caller: Admin → Site settings → Notifications,
 * then ADMIN_NOTIFICATION_EMAIL, then CONTACT_TO_EMAIL.
 */
export function emailProviderConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && (process.env.NOTIFICATION_FROM_EMAIL || process.env.CONTACT_FROM_EMAIL));
}

export function envNotificationRecipient(): string | null {
  return process.env.ADMIN_NOTIFICATION_EMAIL || process.env.CONTACT_TO_EMAIL || null;
}

export async function sendAdminNotification(n: AdminNotification, to: string | null): Promise<SendResult> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.NOTIFICATION_FROM_EMAIL || process.env.CONTACT_FROM_EMAIL;
  if (!key || !from || !to) {
    if (process.env.NODE_ENV !== "production") {
      console.info(`[engagement] Email not configured; ${n.category.toLowerCase()} from ${n.name} was not emailed.`);
      return { ok: true, mode: "dev-log" };
    }
    return { ok: false, reason: "not-configured" };
  }

  const subject = `[VoltageAfrica] ${n.category}: ${n.subject}`.replace(/[\r\n]+/g, " ").slice(0, 200);
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [to], reply_to: n.email, subject, html: renderHtml(n), text: renderText(n) }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      console.error("[engagement] Resend error", res.status, (await res.text().catch(() => "")).slice(0, 300));
      return { ok: false, reason: "provider-error" };
    }
    const data = (await res.json().catch(() => ({}))) as { id?: string };
    return { ok: true, id: data.id, mode: "resend" };
  } catch (err) {
    console.error("[engagement] Resend request failed", err instanceof Error ? err.message : err);
    return { ok: false, reason: "provider-error" };
  }
}

const when = (d: Date) => d.toLocaleString("en-GB", { dateStyle: "full", timeStyle: "short", timeZone: "UTC" }) + " UTC";

function renderText(n: AdminNotification): string {
  const lines = [
    `New ${n.category.toLowerCase()} · VoltageAfrica`,
    "",
    `Name: ${n.name}`,
    n.organisation ? `Organisation: ${n.organisation}` : null,
    `Email: ${n.email}`,
    ...n.details.filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`),
    `Received: ${when(n.submittedAt)}`,
    "",
    ...n.blocks.filter(([, v]) => v).flatMap(([k, v]) => [`${k}:`, String(v), ""]),
    n.adminUrl ? `Open in the Engagement Inbox: ${n.adminUrl}` : null,
    "",
    "Reply to this email to answer the sender directly.",
  ];
  return lines.filter((l) => l !== null).join("\n");
}

function renderHtml(n: AdminNotification): string {
  const e = escapeHtml;
  const row = (k: string, v: string) =>
    `<tr><td style="padding:10px 16px 10px 0;border-bottom:1px solid #e9e3d5;color:#625d51;font-size:13px;white-space:nowrap;vertical-align:top">${e(k)}</td><td style="padding:10px 0;border-bottom:1px solid #e9e3d5;color:#24241f;font-size:14px">${v}</td></tr>`;
  const rows = [
    row("Name", e(n.name)),
    n.organisation ? row("Organisation", e(n.organisation)) : "",
    row("Email", `<a href="mailto:${e(n.email)}" style="color:#344b3b">${e(n.email)}</a>`),
    ...n.details.filter(([, v]) => v).map(([k, v]) => row(k, e(String(v)))),
    row("Received", e(when(n.submittedAt))),
  ].join("");
  const blocks = n.blocks
    .filter(([, v]) => v)
    .map(
      ([k, v]) =>
        `<p style="margin:28px 0 8px;font:600 11px/1 -apple-system,Segoe UI,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:#95570f">${e(k)}</p><div style="white-space:pre-wrap;font-size:15px;line-height:1.65;color:#24241f">${e(String(v))}</div>`,
    )
    .join("");
  const button = n.adminUrl
    ? `<p style="margin:36px 0 0"><a href="${e(n.adminUrl)}" style="display:inline-block;background:#24241f;color:#f3efe5;text-decoration:none;font-size:14px;font-weight:500;padding:14px 22px">Open in the Engagement Inbox &rarr;</a></p>`
    : "";

  return `<!doctype html><html><body style="margin:0;padding:0;background:#f3efe5">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3efe5;padding:32px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:620px;background:#ffffff;border-top:3px solid #e8a344">
<tr><td style="padding:36px 36px 40px;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#24241f">
<p style="margin:0;font:600 11px/1 -apple-system,Segoe UI,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:#95570f">New ${e(n.category.toLowerCase())}</p>
<h1 style="margin:14px 0 24px;font:400 30px/1.15 Georgia,'Times New Roman',serif;color:#24241f">${e(n.name)}${n.organisation ? ` <span style="color:#625d51;font-style:italic">· ${e(n.organisation)}</span>` : ""}</h1>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border-top:1px solid #e9e3d5">${rows}</table>
${blocks}
${button}
</td></tr>
<tr><td style="padding:18px 36px;background:#e9e3d5;font:12px/1.5 -apple-system,Segoe UI,sans-serif;color:#625d51">Sent by the VoltageAfrica website. Reply to this email to answer ${e(n.name)} directly.</td></tr>
</table></td></tr></table></body></html>`;
}
