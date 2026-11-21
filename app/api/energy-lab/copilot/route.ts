import { createHash } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { askCopilot } from "@/lib/energy-lab/ai";
import { labSettings } from "@/lib/energy-lab/cms";
import { copilotRequestSchema } from "@/lib/energy-lab/schema";
import { getPage } from "@/lib/cms/queries";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_BODY = 24_000;

function clientKey(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
  // Same salt fallback as the engagement forms: an unsalted hash of an IPv4 address is trivially reversible.
  const salt = process.env.IP_HASH_SALT || process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(-12) || "";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex").slice(0, 32);
}

function sameOrigin(req: NextRequest) {
  if (req.headers.get("sec-fetch-site") === "cross-site") return false;
  const origin = req.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === (req.headers.get("x-forwarded-host") ?? req.headers.get("host"));
  } catch {
    return false;
  }
}

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store", ...headers } });

/** AI Energy Copilot. Recomputes the simulation server-side from the validated scenario; the client's numbers are never trusted. */
export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return json({ error: "Cross-site requests are not accepted." }, 403);
  if (!(req.headers.get("content-type") ?? "").includes("application/json")) return json({ error: "Send JSON." }, 415);

  const key = clientKey(req);
  const burst = rateLimit(`lab:burst:${key}`, 6, 60_000);
  const hourly = rateLimit(`lab:hour:${key}`, 40, 60 * 60_000);
  if (!burst.ok || !hourly.ok) return json({ error: "Too many questions. Please wait a moment." }, 429, { "Retry-After": String(Math.max(burst.retryAfter, hourly.retryAfter)) });

  const raw = await req.text();
  if (raw.length > MAX_BODY) return json({ error: "Request too large." }, 413);
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return json({ error: "Invalid JSON." }, 400);
  }
  const parsed = copilotRequestSchema.safeParse(body);
  if (!parsed.success) return json({ error: "Invalid request.", issues: parsed.error.issues.slice(0, 5).map((i) => `${i.path.join(".")}: ${i.message}`) }, 400);

  // Respect the CMS switches when the Energy Lab page exists.
  const page = await getPage("energy-lab").catch(() => null);
  const section = page?.sections.find((s) => s.type === "energy_lab");
  if (section) {
    const s = labSettings(section.content);
    if (s.paused) return json({ error: "The Energy Lab is closed at the moment." }, 403);
    if (s.copilotOff) return json({ error: "The copilot is turned off." }, 403);
  }

  try {
    const answer = await askCopilot(parsed.data);
    return json(answer);
  } catch (e) {
    console.error("[energy-lab] copilot failed:", e instanceof Error ? e.message : e);
    return json({ error: "The copilot could not answer right now." }, 500);
  }
}

export function GET() {
  return json({ error: "Method not allowed." }, 405, { Allow: "POST" });
}
