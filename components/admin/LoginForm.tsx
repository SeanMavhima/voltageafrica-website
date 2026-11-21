"use client";

import { useActionState, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { sendMagicLink, signIn, type ActionResult } from "@/lib/cms/actions";
import { cn } from "@/lib/utils";

const input = "mt-1.5 w-full rounded-lg border border-ws-line bg-white px-3 py-2.5 text-[14px] outline-none focus:border-ws-ink/50";

export function LoginForm({ next }: { next: string }) {
  const [mode, setMode] = useState<"password" | "link">("password");
  const [pwState, pwAction, pwPending] = useActionState<ActionResult | null, FormData>(signIn, null);
  const [lkState, lkAction, lkPending] = useActionState<ActionResult | null, FormData>(sendMagicLink, null);
  const state = mode === "password" ? pwState : lkState;

  return (
    <div className="mt-8">
      <div className="mb-5 grid grid-cols-2 rounded-lg bg-ws-ink/[0.06] p-1 text-[13px] font-medium" role="tablist">
        {(["password", "link"] as const).map((m) => (
          <button key={m} type="button" role="tab" aria-selected={mode === m} onClick={() => setMode(m)} className={cn("rounded-md py-1.5", mode === m ? "bg-white shadow-sm" : "text-ws-ink/60")}>
            {m === "password" ? "Password" : "Email link"}
          </button>
        ))}
      </div>
      <form action={mode === "password" ? pwAction : lkAction} className="space-y-4">
        <input type="hidden" name="next" value={next} />
        <label className="block text-[13px] font-medium">
          Email
          <input name="email" type="email" autoComplete="email" required className={input} />
        </label>
        {mode === "password" && (
          <label className="block text-[13px] font-medium">
            Password
            <input name="password" type="password" autoComplete="current-password" required className={input} />
          </label>
        )}
        {state && (
          <p role={state.ok ? "status" : "alert"} className={cn("rounded-lg p-3 text-[13px]", state.ok ? "bg-emerald-50 text-emerald-900" : "bg-red-50 text-red-800")}>
            {state.ok ? state.message : state.error}
          </p>
        )}
        <button type="submit" disabled={pwPending || lkPending} className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-ws-ink text-[14px] font-medium text-white hover:bg-forest disabled:opacity-60">
          {(pwPending || lkPending) && <LoaderCircle className="h-4 w-4 animate-spin" />}
          {mode === "password" ? "Sign in" : "Email me a sign-in link"}
        </button>
      </form>
    </div>
  );
}
