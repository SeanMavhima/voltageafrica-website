import type { ReactNode } from "react";
import { Hero } from "@/components/hero/Hero";
import { PageIntro } from "@/components/pages/PageIntro";
import { NextPage } from "@/components/pages/NextPage";
import { ContactBand, ExploreIndex, HomeStatement } from "@/components/pages/HomeSections";
import { MicrogridSection } from "@/components/sections/MicrogridSection";
import { Challenge } from "@/components/sections/Challenge";
import { Approach } from "@/components/sections/Approach";
import { Intelligence } from "@/components/sections/Intelligence";
import { Productive } from "@/components/sections/Productive";
import { Future } from "@/components/sections/Future";
import { Shurugwi } from "@/components/sections/Shurugwi";
import { Media as PublicationsSection } from "@/components/sections/Media";
import { Founder } from "@/components/sections/Founder";
import { Principles } from "@/components/sections/Principles";
import { Journey } from "@/components/timeline/Journey";
import { Contact } from "@/components/contact/Contact";
import { EngagementPaths, PartnershipSection, SupportSection } from "@/components/engagement/sections";
import { DonateSection } from "@/components/engagement/DonateSection";
import { Act } from "@/components/home/Act";
import { KeyFacts } from "@/components/home/KeyFacts";
import { Boilerplate, Downloads } from "@/components/home/PressKit";
import { EnergyLabSection } from "@/components/energy-lab/EnergyLabSection";
import {
  AwardsSection,
  FeatureListSection,
  FullImageSection,
  GallerySection,
  PartnersSection,
  ProjectsSection,
  QuoteSection,
  RichTextSection,
  SplitSection,
  StatsSection,
  TextImageSection,
  VideoSection,
} from "./blocks";
import { image, list, text } from "@/lib/cms/content";
import { mergeGridComponents } from "@/lib/cms/microgrid";
import {
  getAwards,
  getMediaById,
  getMilestones,
  getPeople,
  getPrinciples,
  getProjects,
  getPublications,
  getSiteSettings,
  getTechnology,
} from "@/lib/cms/queries";
import type { Media, Section } from "@/lib/cms/types";

/** Resolve a section image to its media-library record (for caption & credit). */
async function mediaFor(content: Record<string, unknown>, key: string): Promise<Media | null> {
  const v = image(content, key);
  if (!v) return null;
  const m = v.id ? await getMediaById(v.id) : null;
  return m ? { ...m, alt: v.alt || m.alt } : { ...v };
}

async function renderSection(section: Section, isFirst: boolean): Promise<ReactNode> {
  const c = section.content;
  const bg = section.settings.background;
  switch (section.type) {
    case "hero": {
      const scenes = await Promise.all(
        list(c, "scenes").map(async (r) => {
          const m = await mediaFor(r, "image");
          return m ? { ...m, title: text(r, "title"), sceneCaption: text(r, "caption"), position: text(r, "position"), motion: text(r, "motion") } : null;
        }),
      );
      const poster = await mediaFor(c, "image");
      return (
        <Hero
          content={poster ? { ...c, image: poster } : c}
          scenes={scenes.filter((x): x is NonNullable<typeof x> => !!x)}
          components={mergeGridComponents(await getTechnology("microgrid_component"))}
          isFirst={isFirst}
        />
      );
    }
    case "act": {
      const images = await Promise.all(
        list(c, "images").map(async (r) => {
          const m = await mediaFor(r, "image");
          return m ? { ...m, mosaicCaption: text(r, "caption") } : null;
        }),
      );
      return (
        <Act
          content={c}
          media={{ main: await mediaFor(c, "image"), images: images.filter((x): x is NonNullable<typeof x> => !!x) }}
          capabilities={text(c, "layout") === "register" ? await getTechnology("capability") : []}
          isFirst={isFirst}
        />
      );
    }
    case "key_facts":
      return <KeyFacts content={c} background={bg} isFirst={isFirst} />;
    case "downloads":
      return <Downloads content={c} email={(await getSiteSettings()).contactEmail} background={bg} isFirst={isFirst} />;
    case "boilerplate":
      return <Boilerplate content={c} email={(await getSiteSettings()).contactEmail} background={bg} isFirst={isFirst} />;
    case "page_intro":
      return <PageIntro content={c} media={await mediaFor(c, "image")} isFirst={isFirst} />;
    case "statement":
      return <HomeStatement content={c} background={bg} />;
    case "energy_lab":
      return <EnergyLabSection content={c} isFirst={isFirst} />;
    case "microgrid_exhibit":
      return <MicrogridSection content={c} components={mergeGridComponents(await getTechnology("microgrid_component"))} isFirst={isFirst} />;
    case "explore_index":
      return <ExploreIndex content={c} />;
    case "cta_band":
      return <ContactBand content={c} email={(await getSiteSettings()).contactEmail} background={bg} />;
    case "challenge":
      return <Challenge content={c} media={await mediaFor(c, "image")} isFirst={isFirst} />;
    case "approach":
      return <Approach content={c} steps={await getTechnology("approach_step")} isFirst={isFirst} />;
    case "intelligence":
      return <Intelligence content={c} capabilities={await getTechnology("capability")} isFirst={isFirst} />;
    case "productive":
      return <Productive content={c} uses={await getTechnology("productive_use")} isFirst={isFirst} />;
    case "future":
      return <Future content={c} isFirst={isFirst} />;
    case "timeline":
      return <Journey content={c} items={await getMilestones()} isFirst={isFirst} />;
    case "pilot":
      return <Shurugwi content={c} isFirst={isFirst} />;
    case "publications":
      return <PublicationsSection content={c} publications={await getPublications()} isFirst={isFirst} />;
    case "awards":
      return <AwardsSection content={c} awards={await getAwards()} background={bg} isFirst={isFirst} />;
    case "founder": {
      const people = await getPeople();
      return <Founder content={c} founder={people.find((p) => p.isFounder) ?? null} team={people.filter((p) => !p.isFounder)} isFirst={isFirst} />;
    }
    case "principles":
      return <Principles content={c} principles={await getPrinciples()} media={await mediaFor(c, "image")} isFirst={isFirst} />;
    case "projects_list":
      return <ProjectsSection content={c} projects={await getProjects()} background={bg} isFirst={isFirst} />;
    case "contact":
      return <Contact content={c} media={await mediaFor(c, "image")} settings={await getSiteSettings()} isFirst={isFirst} />;
    case "partnership":
      return <PartnershipSection content={c} media={await mediaFor(c, "image")} email={(await getSiteSettings()).contactEmail} isFirst={isFirst} />;
    case "donate":
      return <DonateSection content={c} isFirst={isFirst} />;
    case "support":
      return <SupportSection content={c} media={await mediaFor(c, "image")} email={(await getSiteSettings()).contactEmail} isFirst={isFirst} />;
    case "engagement_paths":
      return <EngagementPaths content={c} background={bg} isFirst={isFirst} />;
    case "next_page":
      return <NextPage content={c} />;
    case "text_image":
      return <TextImageSection content={c} background={bg} isFirst={isFirst} />;
    case "full_image":
      return <FullImageSection content={c} isFirst={isFirst} />;
    case "gallery":
      return <GallerySection content={c} background={bg} isFirst={isFirst} />;
    case "video":
      return <VideoSection content={c} background={bg} isFirst={isFirst} />;
    case "quote":
      return <QuoteSection content={c} background={bg} />;
    case "stats":
      return <StatsSection content={c} background={bg} isFirst={isFirst} />;
    case "feature_list":
      return <FeatureListSection content={c} background={bg} isFirst={isFirst} />;
    case "rich_text":
      return <RichTextSection content={c} background={bg} isFirst={isFirst} />;
    case "split":
      return <SplitSection content={c} background={bg} isFirst={isFirst} />;
    case "partners":
      return <PartnersSection content={c} background={bg} isFirst={isFirst} />;
    default:
      if (process.env.NODE_ENV !== "production") console.warn(`[cms] No component registered for section type "${section.type}"`);
      return null;
  }
}

const ANCHOR = /^[a-z0-9][a-z0-9-]{0,59}$/;

export async function SectionRenderer({ sections }: { sections: Section[] }) {
  const rendered = await Promise.all(
    sections.map(async (s, i) => {
      try {
        return { s, node: await renderSection(s, i === 0) };
      } catch (e) {
        console.error(`[cms] Section ${s.id} (${s.type}) failed to render:`, e);
        return { s, node: null };
      }
    }),
  );
  return (
    <>
      {rendered.map(({ s, node }) => {
        if (!node) return null;
        const anchor = s.settings.anchor && ANCHOR.test(s.settings.anchor) ? s.settings.anchor : undefined;
        return (
          <div key={s.id} id={anchor} className={anchor ? "scroll-mt-20" : undefined} data-section={s.type}>
            {node}
          </div>
        );
      })}
    </>
  );
}
