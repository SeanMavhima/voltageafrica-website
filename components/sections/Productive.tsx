import { list, text, type C } from "@/lib/cms/content";
import type { TechItem } from "@/lib/cms/types";
import { Reveal } from "@/components/ui/Reveal";
import { Accent } from "@/components/ui/Accent";
import { cn } from "@/lib/utils";

const ink = { fill: "none", stroke: "var(--color-charcoal)", strokeWidth: 1.4, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
const amber = { fill: "none", stroke: "#e8a344", strokeWidth: 2, strokeLinecap: "round" as const };

/** Technical line drawings, 240×160. */
function Plate({ k }: { k: string }) {
  switch (k) {
    case "irrigation":
      return (
        <g>
          <path d="M10 140 H230" {...ink} />
          <path d="M150 140 V70 M190 140 V70 M150 70 H190 M150 105 L190 70 M190 105 L150 70" {...ink} />
          <rect x="140" y="30" width="60" height="40" rx="4" {...ink} />
          <path d="M140 44 H200" {...ink} strokeDasharray="3 4" />
          <rect x="40" y="112" width="30" height="28" {...ink} />
          <path d="M70 124 H120 V58 H140" {...ink} />
          <path d="M70 124 H120 V58 H140" {...amber} strokeDasharray="4 8" className="flow-dash" />
          {[20, 40, 60, 80, 100].map((x) => (
            <path key={x} d={`M${x} 140 q 4 -14 8 0`} {...ink} strokeOpacity="0.5" />
          ))}
        </g>
      );
    case "milling":
      return (
        <g>
          <path d="M10 140 H230" {...ink} />
          <path d="M70 140 V70 H170 V140" {...ink} />
          <path d="M60 70 L120 36 L180 70" {...ink} />
          <path d="M100 82 H140 L128 104 H112 Z" {...ink} />
          <rect x="106" y="104" width="28" height="22" {...ink} />
          <circle cx="120" cy="115" r="6" {...amber} />
          <path d="M98 140 L104 126 H136 L142 140" {...ink} />
          <path d="M190 140 V96 M184 96 H196" {...ink} />
          <path d="M190 96 Q 200 70 170 70" {...amber} strokeDasharray="4 8" className="flow-dash" />
        </g>
      );
    case "cold":
      return (
        <g>
          <path d="M10 140 H230" {...ink} />
          <rect x="60" y="52" width="120" height="88" {...ink} />
          <path d="M120 52 V140" {...ink} />
          <path d="M112 90 V104 M128 90 V104" {...ink} />
          {[0, 60, 120].map((r) => (
            <g key={r} transform={`rotate(${r} 90 78)`}>
              <path d="M90 66 V90" {...amber} strokeWidth="1.6" />
            </g>
          ))}
          <rect x="180" y="70" width="20" height="34" {...ink} />
          <path d="M184 78 H196 M184 86 H196 M184 94 H196" {...ink} strokeOpacity="0.6" />
          <rect x="140" y="64" width="30" height="5" fill="#e8a344" stroke="none" />
        </g>
      );
    case "business":
      return (
        <g>
          <path d="M10 140 H230" {...ink} />
          {[30, 100, 170].map((x, i) => (
            <g key={x}>
              <rect x={x} y="70" width="60" height="70" {...ink} />
              <path d={`M${x - 6} 70 L${x + 6} 54 H${x + 54} L${x + 66} 70`} {...ink} />
              <path d={`M${x} 70 q 7.5 10 15 0 q 7.5 10 15 0 q 7.5 10 15 0 q 7.5 10 15 0`} {...ink} strokeOpacity="0.6" />
              <rect x={x + 10} y="92" width="40" height="26" {...(i === 1 ? amber : ink)} />
            </g>
          ))}
        </g>
      );
    default:
      return (
        <g>
          <path d="M10 140 H230" {...ink} />
          <rect x="40" y="76" width="160" height="64" {...ink} />
          <path d="M30 76 L120 40 L210 76" {...ink} />
          {[56, 92, 128, 164].map((x, i) => (
            <rect key={x} x={x} y="92" width="22" height="18" {...(i === 2 ? amber : ink)} />
          ))}
          <path d="M112 140 V118 H128 V140" {...ink} />
          <path d="M215 140 V30 M215 30 H232 V42 H215" {...ink} />
        </g>
      );
  }
}

export function Productive({ content, uses, isFirst = false }: { content: C; uses: TechItem[]; isFirst?: boolean }) {
  const c = { kicker: text(content, "kicker"), headline: text(content, "headline"), intro: text(content, "intro") };
  const productiveUses = uses.map((u) => ({ key: u.key, title: u.title, body: u.body, enables: u.enables ?? "" }));
  const chain = list(content, "chain").map((x) => [text(x, "title"), text(x, "body")] as [string, string]);
  const revenueModel = list(content, "revenue").map((x) => ({ title: text(x, "title"), body: text(x, "body") }));
  const H = isFirst ? "h1" : "h2";
  return (
    <section aria-labelledby="productive-title" className="contour relative bg-parchment py-[clamp(6rem,12vw,10rem)]">
      <div className="shell">
        <div className="grid gap-10 lg:grid-cols-12">
          <Reveal className="lg:col-span-7">
            <p className="kicker text-amber-ink">{c.kicker}</p>
            <H id="productive-title" className="display mt-6 text-[clamp(3rem,7vw,7.4rem)] text-charcoal">
              <Accent text={c.headline} className="text-forest" />
            </H>
          </Reveal>
          <Reveal delay={0.1} className="lg:col-span-4 lg:col-start-9 lg:self-end">
            <p className="text-lg leading-relaxed text-charcoal-2">{c.intro}</p>
          </Reveal>
        </div>

        {/* Plates */}
        <div className="mt-[clamp(4rem,8vw,6rem)] grid gap-5 md:grid-cols-6">
          {productiveUses.map((u, i) => (
            <Reveal key={u.key} delay={(i % 3) * 0.06} className={cn(i < 2 ? "md:col-span-3" : "md:col-span-2")}>
              <article className="group flex h-full flex-col bg-paper p-6 transition-shadow duration-500 hover:shadow-[0_30px_60px_-40px_rgb(36_36_31/0.5)] sm:p-8">
                <div className="flex items-baseline justify-between">
                  <span className="mono text-stone">Plate {String(i + 1).padStart(2, "0")}</span>
                  <span className="kicker text-amber-ink">{u.enables}</span>
                </div>
                <svg viewBox="0 0 240 160" className={cn("my-6 w-full", i < 2 ? "h-48" : "h-36")} aria-hidden>
                  <Plate k={u.key} />
                </svg>
                <h3 className="display text-[clamp(1.8rem,2.6vw,2.4rem)] text-charcoal">{u.title}</h3>
                <p className="mt-3 leading-relaxed text-stone">{u.body}</p>
              </article>
            </Reveal>
          ))}
        </div>

        {/* Energy → income */}
        <Reveal className="mt-20">
          <ol className="flex flex-col divide-y divide-rule border-y border-rule md:flex-row md:divide-x md:divide-y-0">
            {chain.map(([a, b], i) => (
              <li key={a} className="flex flex-1 items-baseline gap-4 py-6 md:px-6 md:first:pl-0">
                <span className="mono text-stone">{String(i + 1).padStart(2, "0")}</span>
                <span>
                  <span className="display block text-4xl text-charcoal">{a}</span>
                  <span className="mt-1 block text-sm text-stone">{b}</span>
                </span>
              </li>
            ))}
          </ol>
        </Reveal>

        {/* Revenue model */}
        <div className="mt-20 grid gap-12 lg:grid-cols-12">
          <Reveal className="lg:col-span-4">
            <p className="kicker text-amber-ink">{text(content, "revenueKicker")}</p>
            <p className="display mt-5 text-[clamp(1.9rem,3vw,2.7rem)] leading-[1.05] text-charcoal">
              <Accent text={text(content, "revenueTitle")} className="text-forest" />
            </p>
          </Reveal>
          <ol className="grid gap-10 sm:grid-cols-3 lg:col-span-8">
            {revenueModel.map((r, i) => (
              <Reveal as="li" key={r.title} delay={i * 0.06} className="border-t-2 border-charcoal pt-5">
                <p className="mono text-stone">Stream {String(i + 1).padStart(2, "0")}</p>
                <h3 className="serif mt-4 text-2xl text-charcoal">{r.title}</h3>
                <p className="mt-3 text-[0.9375rem] leading-relaxed text-stone">{r.body}</p>
              </Reveal>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
