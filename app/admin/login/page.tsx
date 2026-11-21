import { redirect } from "next/navigation";
import { Logo } from "@/components/ui/Logo";
import { LoginForm } from "@/components/admin/LoginForm";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getAdmin } from "@/lib/cms/auth";

export const dynamic = "force-dynamic";
export const metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;
  if (isSupabaseConfigured && (await getAdmin())) redirect("/admin");
  return (
    <div className="grid min-h-svh lg:grid-cols-[1.1fr_1fr]">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-ws-ink p-12 text-white lg:flex">
        <Logo tone="reverse" height={24} />
        <div>
          <p className="font-serif text-[3.2rem] leading-[1.02]">
            Manage the website, <em className="text-amber">without touching code.</em>
          </p>
          <p className="mt-5 max-w-[42ch] text-[15px] leading-relaxed text-white/60">Pages and sections, the timeline, publications, awards, projects, media and messages, all in one place.</p>
        </div>
        <p className="text-[12px] text-white/40">Administrator access only. There is no public sign-up.</p>
      </div>
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <Logo variant="stacked" height={64} className="mb-10 lg:hidden" />
          {isSupabaseConfigured ? (
            <>
              <h1 className="font-serif text-3xl">Sign in</h1>
              <p className="mt-2 text-[14px] text-ws-ink/60">Use the administrator account created during setup.</p>
              {error === "link" && <p className="mt-4 rounded-lg bg-red-50 p-3 text-[13px] text-red-800">That sign-in link was invalid, expired, or not for an administrator.</p>}
              <LoginForm next={next ?? "/admin"} />
            </>
          ) : (
            <div>
              <h1 className="font-serif text-3xl">Connect Supabase</h1>
              <p className="mt-3 text-[14px] leading-relaxed text-ws-ink/70">
                The CMS is installed but not connected to a database yet. The public website is currently showing its bundled content.
              </p>
              <ol className="mt-5 list-decimal space-y-2 pl-5 text-[13px] leading-relaxed text-ws-ink/80">
                <li>Create a Supabase project.</li>
                <li>
                  Run the SQL in <code className="rounded bg-white px-1">supabase/migrations</code>, then <code className="rounded bg-white px-1">supabase/seed.sql</code>.
                </li>
                <li>
                  Set <code className="rounded bg-white px-1">NEXT_PUBLIC_SUPABASE_URL</code>, <code className="rounded bg-white px-1">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> and{" "}
                  <code className="rounded bg-white px-1">SUPABASE_SERVICE_ROLE_KEY</code> in Vercel.
                </li>
                <li>Create your administrator account (README → “CMS setup”, step 6), then redeploy.</li>
              </ol>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
