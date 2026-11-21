import { HeartHandshake, ShieldCheck } from "lucide-react";
import { Accent } from "@/components/ui/Accent";
import { ButtonLink } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { list, num, text, type C } from "@/lib/cms/content";
import { donateCopy } from "@/lib/engagement/copy";
import { sectionPad } from "./sections";

/** Where the pledge fallback and "other ways" link land: the support form's heading on /support. */
const PLEDGE_HREF = "#support-form-title";

function money(n: number, currency: string) {
  try {
    return new Intl.NumberFormat("en", { style: "currency", currency, maximumFractionDigits: 0 }).format(n);
  } catch {
    return `${currency} ${Math.round(n).toLocaleString("en")}`;
  }
}

/**
 * Fundraising band (section type "donate").
 * Honest by construction: the button goes to an external payment page only when one is configured
 * (https only; card details never touch this site), otherwise it becomes a pledge that opens the
 * support form. The goal bar and gift tiers render only when real figures have been entered.
 */
export function DonateSection({ content: c, isFirst }: { content: C; isFirst: boolean }) {
  const H = isFirst ? "h1" : "h2";
  const d = donateCopy;
  const url = text(c, "donateUrl");
  const payable = /^https:\/\//i.test(url);
  const currency = (text(c, "currency", "USD").trim().toUpperCase() || "USD").slice(0, 3);
  const goal = num(c, "goalAmount", 0);
  const raised = Math.max(0, num(c, "raisedAmount", 0));
  const pct = goal > 0 ? Math.min(100, (raised / goal) * 100) : 0;
  const updated = text(c, "goalUpdated");
  const tiers = list(c, "tiers")
    .map((t) => ({ amount: num(t, "amount", 0), title: text(t, "title"), body: text(t, "body") }))
    .filter((t) => t.amount > 0 && t.title);

  return (
    <section aria-labelledby="donate-title" className={`on-forest contour-light relative bg-forest text-parchment ${sectionPad(isFirst)}`}>
      <div className="shell">
        <div className="grid gap-12 lg:grid-cols-12 lg:items-end lg:gap-10">
          <Reveal className="lg:col-span-7">
            <p className="kicker flex items-center gap-3 text-amber-soft">
              <span className="h-2 w-2 rounded-full bg-amber" aria-hidden />
              {text(c, "kicker", d.kicker)}
            </p>
            <H id="donate-title" className="display mt-6 text-[clamp(2.8rem,6vw,6rem)] text-parchment">
              <Accent text={text(c, "headline", d.headline)} className="text-amber" />
            </H>
            <p className="mt-8 max-w-[54ch] text-lg leading-relaxed text-parchment/90">{text(c, "intro", d.intro)}</p>

            <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-5">
              {payable ? (
                <ButtonLink href={url} external variant="amber">
                  {text(c, "donateLabel", d.donateLabel)}
                </ButtonLink>
              ) : (
                <ButtonLink href={PLEDGE_HREF} variant="amber">
                  {text(c, "pledgeLabel", d.pledgeLabel)}
                </ButtonLink>
              )}
              {payable && (
                <ButtonLink href={PLEDGE_HREF} variant="line-light">
                  {text(c, "otherWaysLabel", d.otherWaysLabel)}
                </ButtonLink>
              )}
            </div>
            {(payable ? text(c, "methodsNote", d.methodsNote) : text(c, "noLinkNote", d.noLinkNote)) && (
              <p className="mt-5 max-w-[56ch] text-[0.9375rem] leading-relaxed text-sage">
                {payable ? text(c, "methodsNote", d.methodsNote) : text(c, "noLinkNote", d.noLinkNote)}
              </p>
            )}
          </Reveal>

          <Reveal delay={0.08} className="lg:col-span-5">
            {goal > 0 ? (
              <figure className="border border-forest-rule bg-forest-2/70 p-7 sm:p-9">
                <figcaption className="kicker text-amber-soft">{text(c, "goalLabel", d.goalLabel)}</figcaption>
                <p className="mt-5 flex flex-wrap items-baseline gap-x-3">
                  <span className="display text-[clamp(2.6rem,4.6vw,3.8rem)] leading-none text-parchment">{money(raised, currency)}</span>
                  <span className="text-parchment/80">of {money(goal, currency)}</span>
                </p>
                <div
                  className="mt-6 h-2.5 w-full overflow-hidden rounded-full bg-parchment/15"
                  role="progressbar"
                  aria-label="Funding progress"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(pct)}
                  aria-valuetext={`${money(raised, currency)} raised of ${money(goal, currency)} (${Math.round(pct)}%)`}
                >
                  <div className="h-full rounded-full bg-amber" style={{ width: `${Math.max(pct, raised > 0 ? 2 : 0)}%` }} />
                </div>
                <p className="mono mt-3 flex justify-between uppercase text-sage">
                  <span>{Math.round(pct)}% funded</span>
                  {updated && <span>Updated {updated}</span>}
                </p>
              </figure>
            ) : (
              <aside aria-labelledby="donate-trust" className="border border-forest-rule p-7 sm:p-9">
                <p id="donate-trust" className="kicker flex items-center gap-2 text-amber-soft">
                  <ShieldCheck className="h-4 w-4" aria-hidden /> {text(c, "trustTitle", d.trustTitle)}
                </p>
                <p className="mt-4 leading-relaxed text-parchment/85">{text(c, "trustNote", d.trustNote)}</p>
              </aside>
            )}
          </Reveal>
        </div>

        {tiers.length > 0 && (
          <div className="mt-[clamp(3.5rem,7vw,5.5rem)]">
            <Reveal>
              <p className="kicker text-parchment/80">{text(c, "tiersTitle", d.tiersTitle)}</p>
            </Reveal>
            <ul className="mt-5 grid gap-px overflow-hidden border border-forest-rule bg-forest-rule sm:grid-cols-2 lg:grid-cols-4">
              {tiers.map((t, i) => (
                <Reveal as="li" key={`${t.amount}-${i}`} delay={i * 0.05} className="flex flex-col bg-forest p-7">
                  <HeartHandshake className="h-5 w-5 text-amber" aria-hidden />
                  <p className="display mt-5 text-[2.4rem] leading-none text-parchment">{money(t.amount, currency)}</p>
                  <p className="mt-3 font-medium text-parchment">{t.title}</p>
                  {t.body && <p className="mt-2 text-[0.9375rem] leading-relaxed text-sage">{t.body}</p>}
                </Reveal>
              ))}
            </ul>
          </div>
        )}

        {goal > 0 && (
          <Reveal delay={0.1} className="mt-12 max-w-[70ch] border-t border-forest-rule pt-6">
            <p className="flex items-start gap-2 text-[0.9375rem] leading-relaxed text-parchment/80">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-amber-soft" aria-hidden />
              <span>
                <span className="font-medium text-parchment">{text(c, "trustTitle", d.trustTitle)}. </span>
                {text(c, "trustNote", d.trustNote)}
              </span>
            </p>
          </Reveal>
        )}
      </div>
    </section>
  );
}
