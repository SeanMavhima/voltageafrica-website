import { NextResponse, type NextRequest } from "next/server";
import { createSessionClient } from "@/lib/supabase/server";
import { getAdmin } from "@/lib/cms/auth";

/** Completes a magic-link sign-in (PKCE code exchange), then admits administrators only. */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  if (code) {
    const db = await createSessionClient();
    await db.auth.exchangeCodeForSession(code);
    if (await getAdmin()) return NextResponse.redirect(new URL("/admin", request.url));
    await db.auth.signOut();
  }
  return NextResponse.redirect(new URL("/admin/login?error=link", request.url));
}
