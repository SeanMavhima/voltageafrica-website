import { ActKicker } from "@/components/home/ActLabel";
import { MicrogridExperience } from "@/components/microgrid/MicrogridExperience";
import { ButtonLink } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { Accent } from "@/components/ui/Accent";
import { link, text, type C } from "@/lib/cms/content";
import type { GridComponent } from "@/lib/data/microgrid";

export function MicrogridSection({ content, components, isFirst = false }: { content: C; components: GridComponent[]; isFirst?: boolean }) {
  const c = { kicker: text(content, "kicker"), headline: text(content, "headline"), intro: text(content, "intro"), disclaimer: text(content, "disclaimer") };
  const cta = link(content, "cta");
  const gridComponents = components;
  const H = isFirst ? "h1" : "h2";
  return (
    <section aria-labelledby="microgrid-title" className="relative bg-parchment pt-[clamp(6rem,12vw,10rem)]">
      <div className="shell">
        <div className="grid gap-10 lg:grid-cols-12">
          <Reveal className="lg:col-span-8">
            <ActKicker text={c.kicker} fallbackClass="kicker text-amber-ink" />
            <H id="microgrid-title" className="display mt-6 text-[clamp(3rem,7.6vw,8rem)] text-charcoal">
              <Accent text={c.headline} className="text-forest" />
            </H>
          </Reveal>
          <Reveal delay={0.1} className="flex flex-col justify-end gap-8 lg:col-span-4">
            <p className="text-lg leading-relaxed text-charcoal-2">{c.intro}</p>
            {cta && (
              <ButtonLink href={cta.href} variant="solid" className="w-fit">
                {cta.label}
              </ButtonLink>
            )}
          </Reveal>
        </div>
      </div>

      <div className="mt-14">
        <MicrogridExperience mode="embedded" components={components} />
      </div>

      {/* Wall text */}
      <div className="shell grid gap-10 py-12 md:grid-cols-12">
        <div className="md:col-span-5">
          <p className="kicker text-stone">On display</p>
          <p className="serif mt-3 text-xl leading-snug text-charcoal">
            {gridComponents.length} working parts of a community energy hub, from the solar array to the meters on every home.
          </p>
        </div>
        <ol className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm text-charcoal-2 sm:grid-cols-3 md:col-span-4">
          {gridComponents.map((g) => (
            <li key={g.id} className="flex gap-2">
              <span className="mono text-stone">{g.index}</span>
              {g.name}
            </li>
          ))}
        </ol>
        <p className="text-[13px] leading-relaxed text-stone md:col-span-3">{c.disclaimer}</p>
      </div>
    </section>
  );
}
