import Link from "next/link";
import { Accent } from "@/components/ui/Accent";
import type { C } from "@/lib/cms/content";
import { aiStatus } from "@/lib/energy-lab/ai";
import { labSettings } from "@/lib/energy-lab/cms";
import { EnergyLab } from "@/components/ui/lazy";

/** Server wrapper: reads CMS settings and the (server-only) AI status. */
export function EnergyLabSection({ content, isFirst }: { content: C; isFirst: boolean }) {
  const settings = labSettings(content);
  if (settings.paused) {
    const H = isFirst ? "h1" : "h2";
    return (
      <section className="bg-parchment pb-24 pt-[clamp(8rem,14vw,11rem)]">
        <div className="shell">
          <p className="kicker text-amber-ink">{settings.kicker}</p>
          <H className="display mt-6 max-w-[16ch] text-[clamp(3rem,7vw,6.5rem)] text-charcoal">
            <Accent text={settings.headline} className="text-forest" />
          </H>
          <p className="mt-8 max-w-[56ch] text-lg leading-relaxed text-charcoal-2">{settings.pausedMessage}</p>
          <Link href="/microgrid" className="link-underline mt-8 inline-block text-charcoal">
            Meanwhile, explore the 3D microgrid model →
          </Link>
        </div>
      </section>
    );
  }
  return <EnergyLab settings={settings} aiConfigured={aiStatus().configured && !settings.copilotOff} isFirst={isFirst} />;
}
