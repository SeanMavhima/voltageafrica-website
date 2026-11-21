import type { NextRequest } from "next/server";
import { handleEngagementSubmission, methodNotAllowed } from "@/lib/engagement/submit";

export const runtime = "nodejs";

/** Public endpoint for the partnerships form. Validation, spam checks, storage and notification: lib/engagement/submit.ts */
export function POST(req: NextRequest) {
  return handleEngagementSubmission(req, "partnerships");
}

export const GET = methodNotAllowed;
