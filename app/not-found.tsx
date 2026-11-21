import { ButtonLink } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <main id="main" className="shell flex min-h-[80svh] flex-col justify-center py-32">
      <p className="kicker text-amber-ink">404 · Off-grid</p>
      <h1 className="display mt-6 max-w-[14ch] text-[clamp(3rem,8vw,7rem)] text-charcoal">This page has no power yet.</h1>
      <div className="mt-12">
        <ButtonLink href="/">Back to VoltageAfrica</ButtonLink>
      </div>
    </main>
  );
}
