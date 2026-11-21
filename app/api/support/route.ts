import type { NextRequest } from "next/server";
import { handleEngagementSubmission, methodNotAllowed } from "@/lib/engagement/submit";

export const runtime = "nodejs";

/** Public endpoint for the support form. Validation, spam checks, storage and notification: lib/engagement/submit.ts */
export function POST(req: NextRequest) {
  return handleEngagementSubmission(req, "support");
}

export const GET = methodNotAllowed;
