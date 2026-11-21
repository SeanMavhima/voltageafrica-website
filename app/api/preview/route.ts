import { draftMode } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { getAdmin } from "@/lib/cms/auth";

/**
 * Enter preview: only a signed-in administrator can enable Draft Mode.
 * While enabled, pages read drafts through the admin's own session (RLS),
 * so preview data is never exposed to anyone else.
 */
export async function GET(request: NextRequest) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.redirect(new URL("/admin/login", request.url));
  (await draftMode()).enable();
  return NextResponse.redirect(safeTarget(request.nextUrl.searchParams.get("path"), request.url));
}

/**
 * Same-origin, non-admin destination only. Prefix checks are not enough: URL parsers drop tabs and
 * newlines and treat "\" as "/", so "/\t/evil.com" or "/\\evil.com" would leave the site.
 * Resolving first and comparing origins closes every such variant.
 */
function safeTarget(path: string | null, base: string): URL {
  const home = new URL("/", base);
  if (!path || !path.startsWith("/")) return home;
  try {
    const target = new URL(path, base);
    if (target.origin !== home.origin || target.pathname.startsWith("/admin")) return home;
    return target;
  } catch {
    return home;
  }
}
