import { Check } from "lucide-react";
import { list, tags, text, type C } from "@/lib/cms/content";
import { Reveal } from "@/components/ui/Reveal";
import { Accent } from "@/components/ui/Accent";
import { cn } from "@/lib/utils";

function ConceptDiagram({ villageNames }: { villageNames: string[] }) {
  const shurugwi = { villages: villageNames };
  const cx = 300;
  const cy = 285;
  const villages = shurugwi.villages.map((name, i) => {
    const a = -Math.PI / 2 + (i / shurugwi.villages.length) * Math.PI * 2 + 0.25;
    const r = 185 + (i % 2) * 30;
    return { name, x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r * 0.78 };
  });
  return (
    <svg viewBox="0 0 600 570" className="h-auto w-full" role="img" aria-labelledby="sh-diag-t sh-diag-d">
      <title id="sh-diag-t">Conceptual diagram of the proposed Shurugwi pilot</title>
      <desc id="sh-diag-d">
        A proposed community energy hub, site to be confirmed, shown among the five villages engaged during research: {shurugwi.villages.join(", ")}. Not geographic and not to scale.
      </desc>
      {[0, 1, 2, 3, 4, 5, 6].map((k) => (
        <ellipse key={k} cx={cx + k * 7} cy={cy - k * 5} rx={50 + k * 42} ry={34 + k * 31} fill="none" stroke="var(--color-charcoal)" strokeOpacity={0.1 - k * 0.008} />
      ))}
      {[
        [80, 110],
        [530, 480],
        [520, 110],
      ].map(([x, y], i) => (
        <g key={i} fill="none" stroke="var(--color-charcoal)" strokeOpacity="0.35" strokeWidth="1.2">
          <path d={`M${x - 30} ${y} q 12 -26 30 -24 q 20 -4 30 24`} />
          <ellipse cx={x + 2} cy={y - 30} rx="9" ry="7" />
          <ellipse cx={x - 12} cy={y - 22} rx="6" ry="5" />
        </g>
      ))}
      {villages.map((v) => (
        <g key={v.name}>
          <line x1={cx} y1={cy} x2={v.x} y2={v.y} stroke="#e8a344" strokeWidth="2" strokeDasharray="2 7" strokeLinecap="round" className="flow-dash" />
          <circle cx={v.x} cy={v.y} r="16" fill="var(--color-paper)" stroke="var(--color-charcoal)" strokeOpacity="0.25" />
          <circle cx={v.x} cy={v.y} r="5" fill="var(--color-charcoal)" />
          <text x={v.x} y={v.y + 38} textAnchor="middle" fill="var(--color-charcoal)" fontSize="19" fontFamily="var(--font-serif)">
            {v.name}
          </text>
        </g>
      ))}
      <circle cx={cx} cy={cy} r="42" fill="#e8a344" fillOpacity="0.18" />
      <rect x={cx - 24} y={cy - 24} width="48" height="48" fill="none" stroke="var(--color-charcoal)" strokeWidth="1.5" strokeDasharray="4 4" />
      <circle cx={cx} cy={cy} r="10" fill="#e8a344" stroke="var(--color-charcoal)" strokeWidth="1.5" />
      <text x={cx} y={cy + 66} textAnchor="middle" fill="var(--color-amber-ink)" fontSize="11" fontFamily="var(--font-mono)" letterSpacing="2">
        PROPOSED HUB · SITE TBC
      </text>
    </svg>
  );
}

export function Shurugwi({ content, isFirst = false }: { content: C; isFirst?: boolean }) {
  const asPage = isFirst;
  const H = isFirst ? "h1" : "h2";
  const shurugwi = {
    villages: tags(content, "villages"),
    research: list(content, "research").map((x) => ({ value: text(x, "value"), label: text(x, "label") })),
    heard: list(content, "heard").map((x) => text(x, "text")).filter(Boolean),
    stages: list(content, "stages").map((x) => ({ title: text(x, "title"), status: text(x, "status", "Upcoming"), body: text(x, "body") })),
  };
  const HUB_CONCEPT = list(content, "hub").map((x) => ({ t: text(x, "title"), d: text(x, "body") }));
  const c = { kicker: text(content, "kicker"), headline: text(content, "headline"), status: text(content, "status"), intro: text(content, "intro") };
  return (
    <section aria-labelledby="shurugwi-title" className={`relative overflow-hidden bg-paper pb-[clamp(6rem,12vw,10rem)] ${asPage ? "pt-[clamp(8rem,18vh,12rem)]" : "pt-[clamp(6rem,12vw,10rem)]"}`}>
      <div className="shell">
        <div className="grid gap-10 lg:grid-cols-12">
          <Reveal className="lg:col-span-8">
            <p className="kicker text-amber-ink">{c.kicker}</p>
            <H id="shurugwi-title" className="display mt-6 text-[clamp(3.4rem,9vw,9.6rem)] text-charcoal">
              <Accent text={c.headline} className="text-clay" />
            </H>
          </Reveal>
          <Reveal delay={0.1} className="flex flex-col justify-end gap-6 lg:col-span-4">
            <p className="inline-flex w-fit items-center gap-2 rounded-full bg-amber px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-charcoal">
              <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-charcoal" aria-hidden /> {c.status}
            </p>
            <p className="text-lg leading-relaxed text-charcoal-2">{c.intro}</p>
          </Reveal>
        </div>

        <div className="mt-[clamp(4rem,8vw,6rem)] grid gap-14 lg:grid-cols-12">
          <Reveal className="lg:col-span-6">
            <figure className="contour bg-parchment p-4 sm:p-8">
              <ConceptDiagram villageNames={shurugwi.villages} />
              <figcaption className="mono mt-2 text-stone">{text(content, "diagramCaption")}</figcaption>
            </figure>
          </Reveal>

          <div className="lg:col-span-5 lg:col-start-8">
            <Reveal>
              <p className="kicker text-stone">{text(content, "researchTitle")}</p>
              <dl className="mt-6 grid grid-cols-2 gap-x-8">
                {shurugwi.research.map((r) => (
                  <div key={r.label + r.value} className="border-t-2 border-charcoal py-5">
                    <dt className="sr-only">{r.label}</dt>
                    <dd>
                      <span className="display block text-[clamp(3.6rem,6vw,5.4rem)] leading-none text-charcoal">{r.value}</span>
                      <span className="mt-3 block text-sm leading-snug text-stone">{r.label}</span>
                    </dd>
                  </div>
                ))}
              </dl>
            </Reveal>
            <Reveal delay={0.08} className="mt-10">
              <p className="kicker text-stone">{text(content, "heardTitle")}</p>
              <ul className="mt-5 space-y-4">
                {shurugwi.heard.map((h) => (
                  <li key={h} className="serif flex gap-4 text-[1.15rem] leading-snug text-charcoal">
                    <span className="mt-[0.6rem] h-2 w-2 shrink-0 rounded-full bg-amber" aria-hidden />
                    {h}
                  </li>
                ))}
              </ul>
              {text(content, "note") && <p className="mt-6 text-sm text-stone">{text(content, "note")}</p>}
            </Reveal>
          </div>
        </div>

        <Reveal className="mt-24">
          <div className="flex flex-wrap items-baseline justify-between gap-4 border-b-2 border-charcoal pb-4">
            <h3 className="display text-[clamp(2rem,3.2vw,3rem)] text-charcoal">{text(content, "hubTitle")}</h3>
            <span className="kicker text-stone">{text(content, "hubNote")}</span>
          </div>
          <ul className="grid sm:grid-cols-2 lg:grid-cols-5">
            {HUB_CONCEPT.map((h, i) => (
              <li key={h.t} className="border-b border-rule py-6 pr-6 lg:border-b-0 lg:border-r lg:px-6 lg:first:pl-0 lg:last:border-r-0">
                <p className="mono text-stone">{String(i + 1).padStart(2, "0")}</p>
                <p className="serif mt-4 text-xl text-charcoal">{h.t}</p>
                <p className="mt-2 text-sm leading-relaxed text-stone">{h.d}</p>
              </li>
            ))}
          </ul>
        </Reveal>

        {/* Stage track */}
        <Reveal className="mt-24">
          <h3 className="kicker text-stone">{text(content, "stagesTitle")}</h3>
          <ol className="mt-6 grid gap-6 md:grid-cols-3 xl:grid-cols-6 xl:gap-3">
            {shurugwi.stages.map((s, i) => {
              const done = s.status === "Completed";
              const next = s.status === "Next";
              return (
                <li key={s.title + i} className="flex flex-col">
                  <span className={cn("h-2 rounded-full", done ? "bg-forest" : next ? "bg-amber" : "border border-dashed border-charcoal/30")} aria-hidden />
                  <div className="mt-4 flex items-center justify-between">
                    <span className="mono text-stone">{String(i + 1).padStart(2, "0")}</span>
                    <span className={cn("inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.08em]", done ? "text-forest" : next ? "text-amber-ink" : "text-stone")}>
                      {done && <Check className="h-3 w-3" aria-hidden />}
                      {s.status}
                    </span>
                  </div>
                  <p className="serif mt-3 text-lg leading-snug text-charcoal">{s.title}</p>
                  <p className="mt-1.5 text-sm leading-relaxed text-stone">{s.body}</p>
                </li>
              );
            })}
          </ol>
        </Reveal>
      </div>
    </section>
  );
}
