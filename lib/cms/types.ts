/** View models: what public components receive, independent of the database shape. */
import type { ImageValue, LinkValue } from "./fields";

export type { ImageValue, LinkValue };
export type ContentStatus = "draft" | "published" | "archived";

export type Media = ImageValue & {
  width?: number | null;
  height?: number | null;
  caption?: string | null;
  credit?: { author: string; license: string; licenseUrl: string; source: string } | null;
};

export type SiteSettings = {
  siteName: string;
  tagline: string;
  description: string;
  contactEmail: string | null;
  contactPhone: string | null;
  contactLocation: string | null;
  socialLinks: { label: string; url: string }[];
  footerStatement: string;
  footerCopyright: string;
  footerRegions: string;
  navCta: LinkValue;
  /** Quiet text link beside the header button (e.g. "Partner with us"). */
  navSecondary: LinkValue | null;
  defaultSeoTitle: string;
  defaultSeoDescription: string;
};

export type NavItem = { id: string; label: string; href: string; external: boolean };

export type Section = {
  id: string;
  type: string;
  label: string | null;
  content: Record<string, unknown>;
  settings: { background?: string; anchor?: string };
};

export type Page = {
  id: string;
  slug: string;
  title: string;
  seoTitle: string | null;
  seoDescription: string | null;
  sections: Section[];
};

export type Milestone = {
  id: string;
  dateLabel: string;
  title: string;
  body: string;
  kind: string;
  image: Media | null;
  imagePosition: string | null;
  link: LinkValue | null;
  isUpcoming: boolean;
};

export type Publication = {
  id: string;
  outlet: string;
  headline: string;
  date: string;
  category: string;
  description: string;
  href: string;
  image: Media | null;
};

export type Award = {
  id: string;
  title: string;
  organisation: string;
  date: string;
  location: string | null;
  description: string;
  image: Media | null;
  url: string | null;
};

export type Principle = { id: string; title: string; body: string };

export type Person = {
  id: string;
  name: string;
  role: string;
  country: string | null;
  bio: string;
  quote: string | null;
  quoteSource: LinkValue | null;
  image: Media | null;
  socialLinks: { label: string; url: string }[];
  isFounder: boolean;
};

export type TechKind = "approach_step" | "capability" | "productive_use" | "microgrid_component";

export type TechItem = {
  id: string;
  kind: TechKind;
  key: string;
  title: string;
  kicker: string | null;
  body: string;
  points: string[];
  statusLabel: string | null;
  note: string | null;
  enables: string | null;
  image: Media | null;
};

export type Project = {
  id: string;
  slug: string;
  name: string;
  summary: string;
  body: string;
  stage: string;
  location: string | null;
  cover: Media | null;
  categories: string[];
  gallery: (Media & { galleryCaption?: string | null })[];
  milestones: Milestone[];
  publications: Publication[];
};
