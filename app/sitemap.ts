import type { MetadataRoute } from "next";
import { site } from "@/lib/site";
import { getPublishedPageSlugs, getPublishedProjectSlugs } from "@/lib/cms/queries";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const [slugs, projects] = await Promise.all([getPublishedPageSlugs(), getPublishedProjectSlugs()]);
  const paths = ["/", "/microgrid", ...slugs.filter((s) => s !== "home").map((s) => `/${s}`), ...projects.map((p) => `/projects/${p}`)];
  return paths.map((path) => ({ url: `${site.url}${path}`, lastModified: now, changeFrequency: "monthly", priority: path === "/" ? 1 : 0.7 }));
}
