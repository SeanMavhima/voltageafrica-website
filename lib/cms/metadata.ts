import "server-only";
import type { Metadata } from "next";
import { getSiteSettings } from "./queries";
import type { Page } from "./types";

/**
 * The shared link-preview image (1200×630 JPEG, ~100 KB). A static JPEG rather than a generated
 * PNG: WhatsApp and some email clients drop previews for images much over ~300 KB, and the
 * generated PNG was 840 KB. To change the design, see scripts/og/opengraph-image.tsx.
 */
export const shareImage = { url: "/brand/og-share.jpg", width: 1200, height: 630, alt: "VoltageAfrica: Africa's next grid will be built from the village up", type: "image/jpeg" };

/** Open Graph + Twitter fields for a page, always with the share image (metadata merges shallowly). */
export function shareMetadata(title: string, description: string, path: string, siteName = "VoltageAfrica"): Pick<Metadata, "openGraph" | "twitter"> {
  return {
    openGraph: { title, description, url: path, siteName, type: "website", images: [shareImage] },
    twitter: { card: "summary_large_image", title, description, images: [shareImage.url] },
  };
}

export async function pageMetadata(page: Page | null, path: string): Promise<Metadata> {
  const settings = await getSiteSettings();
  if (!page) return { title: "Not found" };
  const title = page.slug === "home" ? { absolute: settings.defaultSeoTitle || settings.siteName } : page.seoTitle || page.title;
  const description = page.seoDescription || settings.defaultSeoDescription || settings.description;
  const fullTitle = typeof title === "string" ? `${title} | ${settings.siteName}` : title.absolute;
  // Metadata merges shallowly: an openGraph object here replaces the root layout's entirely,
  // so the share image must be named explicitly or shared links lose their preview picture.
  return {
    title,
    description,
    alternates: { canonical: path },
    ...shareMetadata(fullTitle, description, path, settings.siteName),
  };
}
