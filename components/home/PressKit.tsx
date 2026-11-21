import { ArrowDownToLine, ArrowUpRight, Mail } from "lucide-react";
import { Reveal } from "@/components/ui/Reveal";
import { Accent } from "@/components/ui/Accent";
import { themeClass } from "@/components/cms/theme";
import { list, text, type C } from "@/lib/cms/content";
import { cn } from "@/lib/utils";
import { CopyButton, PrintButton } from "./CopyButton";

function Head({ c, t, id, isFirst }: { c: C; t: ReturnType<typeof themeClass>; id: string; isFirst: boolean }) {
  const H = isFirst ? "h1" : "h2";
  return (
    <div className="grid gap-6 lg:grid-cols-12 lg:items-end">
      <div className="lg:col-span-7">
        {text(c, "kicker") && <p className={cn("kicker", t.kicker)}>{text(c, "kicker")}</p>}
        <H id={id} className={cn("display mt-5 text-[clamp(2.4rem,4.6vw,4.4rem)]", t.heading)}>
          <Accent text={text(c, "headline")} className={t.accent} />
        </H>
      </div>
      {text(c, "intro") && <p className={cn("max-w-[48ch] text-lg leading-relaxed lg:col-span-5", t.muted)}>{text(c, "intro")}</p>}
    </div>
  );
}

const isExternal = (href: string) => /^https?:\/\//i.test(href) && !href.includes("/storage/v1/object/public/");

/**
 * Downloads: documents, brand files and press photographs. Each row says what it
 * is, its format and size, and downloads directly. Items marked "On request"
 * open an email instead, for documents that are not public.
 */
export function Downloads({ content: c, email, background, isFirst = false }: { content: C; email: string | null; background?: string; isFirst?: boolean }) {
  const t = themeClass(background, "parchment");
  const groups = new Map<string, C[]>();
  for (const it of list(c, "items").filter((i) => text(i, "title"))) {
    const g = text(it, "group", "Downloads");
    groups.set(g, [...(groups.get(g) ?? []), it]);
  }
  const subject = encodeURIComponent(text(c, "requestSubject", "Document request: VoltageAfrica"));
  return (
    <section aria-labelledby="downloads-title" className={cn(t.section, "py-[clamp(5rem,10vw,8rem)]")}>
      <div className="shell">
        <Head c={c} t={t} id="downloads-title" isFirst={isFirst} />
        <div className="mt-[clamp(3rem,6vw,5rem)] grid gap-14 lg:grid-cols-2 lg:gap-x-12">
          {[...groups.entries()].map(([group, items]) => (
            <Reveal key={group}>
              <h3 className={cn("kicker", t.muted)}>{group}</h3>
              <ul className={cn("mt-4 border-t-2", t.dark ? "border-parchment/50" : "border-charcoal")}>
                {items.map((it, i) => {
                  const href = text(it, "href");
                  const onRequest = !href;
                  const target = onRequest ? (email ? `mailto:${email}?subject=${subject}%3A%20${encodeURIComponent(text(it, "title"))}` : "/contact") : href;
                  const external = !onRequest && isExternal(href);
                  const Icon = onRequest ? Mail : external ? ArrowUpRight : ArrowDownToLine;
                  return (
                    <li key={i} className={cn("border-b", t.rule)}>
                      <a
                        href={target}
                        {...(!onRequest && !external ? { download: "" } : {})}
                        {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                        className="group grid grid-cols-[1fr_auto] items-center gap-x-6 gap-y-1 py-5"
                      >
                        <span>
                          <span className={cn("serif block text-[1.3rem] leading-snug transition-colors", t.heading, t.dark ? "group-hover:text-amber" : "group-hover:text-forest")}>{text(it, "title")}</span>
                          {text(it, "description") && <span className={cn("mt-1 block text-[0.9375rem] leading-relaxed", t.muted)}>{text(it, "description")}</span>}
                          <span className={cn("mono mt-2 block uppercase", t.muted)}>{onRequest ? "On request · by email" : text(it, "meta")}</span>
                        </span>
                        <span className={cn("flex h-11 w-11 items-center justify-center rounded-full border transition-colors", t.dark ? "border-parchment/40 group-hover:border-amber group-hover:bg-amber group-hover:text-charcoal" : "border-charcoal/25 group-hover:border-charcoal group-hover:bg-charcoal group-hover:text-amber")}>
                          <Icon className="h-4 w-4" aria-hidden />
                          <span className="sr-only">{onRequest ? "Request by email" : external ? "Open (new tab)" : "Download"}</span>
                        </span>
                      </a>
                    </li>
                  );
                })}
              </ul>
            </Reveal>
          ))}
        </div>
        {text(c, "note") && <p className={cn("mt-10 max-w-[70ch] text-[13px] leading-relaxed", t.muted)}>{text(c, "note")}</p>}
      </div>
    </section>
  );
}

/** Ready-to-use descriptions of the venture, with copy buttons, plus press contact and a printable fact sheet. */
export function Boilerplate({ content: c, email, background, isFirst = false }: { content: C; email: string | null; background?: string; isFirst?: boolean }) {
  const t = themeClass(background, "paper");
  const blocks = list(c, "blocks").filter((b) => text(b, "text"));
  return (
    <section aria-labelledby="boilerplate-title" className={cn(t.section, "py-[clamp(5rem,10vw,8rem)]")}>
      <div className="shell">
        <Head c={c} t={t} id="boilerplate-title" isFirst={isFirst} />
        <div className="mt-[clamp(3rem,6vw,5rem)] grid gap-px bg-rule lg:grid-cols-2">
          {blocks.map((b, i) => (
            <Reveal key={i} delay={i * 0.05} className={cn("flex flex-col p-7 sm:p-9", t.dark ? "bg-forest" : "bg-paper")}>
              <div className="flex items-baseline justify-between gap-4">
                <h3 className={cn("kicker", t.kicker)}>{text(b, "label")}</h3>
                <span className={cn("mono", t.muted)}>{text(b, "text").trim().split(/\s+/).length} words</span>
              </div>
              <p className={cn("mt-5 flex-1 whitespace-pre-line text-[1.0625rem] leading-relaxed", t.heading)}>{text(b, "text")}</p>
              <div className="mt-6">
                <CopyButton value={text(b, "text")} />
              </div>
            </Reveal>
          ))}
        </div>
        <div className={cn("mt-10 flex flex-col gap-6 border-t pt-8 sm:flex-row sm:items-center sm:justify-between", t.rule)}>
          <div>
            <p className={cn("kicker", t.muted)}>{text(c, "contactTitle", "Press & funder contact")}</p>
            {email ? (
              <a href={`mailto:${email}`} className={cn("serif mt-2 inline-block text-[1.5rem] underline decoration-1 underline-offset-[6px]", t.heading)}>
                {email}
              </a>
            ) : (
              <a href="/contact" className={cn("serif mt-2 inline-block text-[1.5rem] underline", t.heading)}>
                Contact us
              </a>
            )}
            {text(c, "contactNote") && <p className={cn("mt-2 text-[0.9375rem]", t.muted)}>{text(c, "contactNote")}</p>}
          </div>
          <PrintButton />
        </div>
      </div>
    </section>
  );
}
