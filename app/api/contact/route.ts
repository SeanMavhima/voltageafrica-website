import type { NextRequest } from "next/server";
import { handleEngagementSubmission, methodNotAllowed } from "@/lib/engagement/submit";

export const runtime = "nodejs";

/** Public endpoint for the contact form. Validation, spam checks, storage and notification: lib/engagement/submit.ts */
export function POST(req: NextRequest) {
  return handleEngagementSubmission(req, "contact");
}

export const GET = methodNotAllowed;
