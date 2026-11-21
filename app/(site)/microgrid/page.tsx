import type { Metadata } from "next";
import { MicrogridExperience } from "@/components/microgrid/MicrogridExperience";
import { getTechnology } from "@/lib/cms/queries";
import { mergeGridComponents } from "@/lib/cms/microgrid";
import { shareMetadata } from "@/lib/cms/metadata";

export const revalidate = 300;

const description =
  "Explore an interactive 3D model of a community solar microgrid: solar generation, battery storage, inverters, distribution, homes, a school and productive-use enterprises.";

export const metadata: Metadata = {
  title: "Inside a VoltageAfrica Microgrid",
  description,
  alternates: { canonical: "/microgrid" },
  ...shareMetadata("Inside a VoltageAfrica Microgrid | VoltageAfrica", description, "/microgrid"),
};

export default async function MicrogridPage() {
  const gridComponents = mergeGridComponents(await getTechnology("microgrid_component"));
  return (
    <main id="main" className="bg-parchment">
      <h1 className="sr-only">Inside a VoltageAfrica microgrid: interactive 3D model</h1>
      <MicrogridExperience mode="full" components={gridComponents} />

      {/* Text alternative of the full model, for screen readers and search. */}
      <section aria-labelledby="mg-text" className="shell border-t border-rule py-20">
        <h2 id="mg-text" className="display text-5xl text-charcoal">
          The system, part by part
        </h2>
        <p className="mt-4 max-w-[70ch] text-sm leading-relaxed text-stone">
          A conceptual model for explanation only. It does not depict an existing installation, and all values are simulated.
        </p>
        <ol className="mt-12 grid gap-x-12 gap-y-10 md:grid-cols-2">
          {gridComponents.map((c) => (
            <li key={c.id} className="border-t border-rule pt-6">
              <p className="kicker text-amber-ink">
                {c.index} · {c.kicker}
              </p>
              <h3 className="serif mt-3 text-2xl text-charcoal">{c.name}</h3>
              <p className="mt-3 leading-relaxed text-charcoal-2">{c.summary}</p>
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}
