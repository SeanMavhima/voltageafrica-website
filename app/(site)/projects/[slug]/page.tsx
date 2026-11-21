import { shareMetadata } from "@/lib/cms/metadata";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { Reveal } from "@/components/ui/Reveal";
import { getProject, getPublishedProjectSlugs } from "@/lib/cms/queries";
import { sanitizeRichText } from "@/lib/cms/sanitize";

export const revalidate = 300;
export const dynamicParams = true;

export async function generateStaticParams() {
  return (await getPublishedProjectSlugs()).map((slug) => ({ slug }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  const p = await getProject((await params).slug);
  if (!p) return { title: "Project not found" };
  return { title: p.name, description: p.summary, alternates: { canonical: `/projects/${p.slug}` }, ...shareMetadata(`${p.name} | VoltageAfrica`, p.summary, `/projects/${p.slug}`) };
}

const prose =
  "max-w-[64ch] text-lg leading-relaxed text-charcoal-2 [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-amber [&_blockquote]:pl-5 [&_h2]:display [&_h2]:mt-10 [&_h2]:text-4xl [&_h2]:text-charcoal [&_h3]:serif [&_h3]:mt-8 [&_h3]:text-2xl [&_h3]:text-charcoal [&_li]:mt-1 [&_ol]:ml-6 [&_ol]:list-decimal [&_p]:mt-4 [&_ul]:ml-6 [&_ul]:list-disc";

/** Reusable project template for any VoltageAfrica initiative. */
export default async function ProjectPage({ params }: Props) {
  const p = await getProject((await params).slug);
  if (!p) notFound();
  return (
    <main id="main" className="bg-parchment">
      <header className="contour pb-16 pt-[clamp(8rem,18vh,12rem)]">
        <div className="shell">
          <Link href="/projects" className="kicker inline-flex items-center gap-2 text-stone hover:text-charcoal">
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> All projects
          </Link>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-amber px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-charcoal">{p.stage}</span>
            {p.location && <span className="kicker text-stone">{p.location}</span>}
          </div>
          <h1 className="display mt-6 max-w-[16ch] text-[clamp(3.2rem,8vw,8rem)] text-charcoal">{p.name}</h1>
          {p.summary && <p className="mt-8 max-w-[56ch] text-xl leading-relaxed text-charcoal-2">{p.summary}</p>}
          {p.categories.length > 0 && (
            <ul className="mt-8 flex flex-wrap gap-2">
              {p.categories.map((c) => (
                <li key={c} className="rounded-full border border-charcoal/20 px-3 py-1 text-sm text-charcoal-2">
                  {c}
                </li>
              ))}
            </ul>
          )}
        </div>
      </header>
      {p.cover && (
        <div className="relative h-[min(70svh,720px)] min-h-[320px] bg-parchment-3">
          <Image src={p.cover.src} alt={p.cover.alt} fill priority sizes="100vw" className="object-cover" />
        </div>
      )}
      <section className="bg-paper py-[clamp(4rem,8vw,7rem)]">
        <div className="shell grid gap-14 lg:grid-cols-12">
          <div className={`${prose} lg:col-span-7`} dangerouslySetInnerHTML={{ __html: sanitizeRichText(p.body) }} />
          {p.milestones.length > 0 && (
            <aside className="lg:col-span-4 lg:col-start-9">
              <p className="kicker text-stone">Milestones</p>
              <ol className="mt-4 border-t-2 border-charcoal">
                {p.milestones.map((m) => (
                  <li key={m.id} className="border-b border-rule py-4">
                    <p className="mono text-stone">{m.dateLabel}</p>
                    <p className="serif mt-1 text-lg text-charcoal">{m.title}</p>
                  </li>
                ))}
              </ol>
            </aside>
          )}
        </div>
      </section>
      {p.gallery.length > 0 && (
        <section className="bg-parchment py-[clamp(4rem,8vw,7rem)]">
          <div className="shell grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {p.gallery.map((g, i) => (
              <Reveal key={i}>
                <figure>
                  <div className="relative aspect-[4/3] overflow-hidden bg-parchment-3">
                    <Image src={g.src} alt={g.alt} fill sizes="(min-width: 1024px) 33vw, 50vw" className="object-cover" />
                  </div>
                  {g.galleryCaption && <figcaption className="mt-3 text-[13px] text-stone">{g.galleryCaption}</figcaption>}
                </figure>
              </Reveal>
            ))}
          </div>
        </section>
      )}
      {p.publications.length > 0 && (
        <section className="bg-paper py-[clamp(4rem,8vw,7rem)]">
          <div className="shell">
            <p className="kicker text-stone">In the press</p>
            <ul className="mt-4 border-t-2 border-charcoal">
              {p.publications.map((x) => (
                <li key={x.id}>
                  <a href={x.href} target="_blank" rel="noopener noreferrer" className="group flex items-baseline justify-between gap-6 border-b border-rule py-5">
                    <span>
                      <span className="kicker block text-amber-ink">{x.outlet}</span>
                      <span className="display mt-2 block text-3xl text-charcoal group-hover:text-forest">{x.headline}</span>
                    </span>
                    <ArrowUpRight className="h-5 w-5 shrink-0" aria-hidden />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </main>
  );
}
