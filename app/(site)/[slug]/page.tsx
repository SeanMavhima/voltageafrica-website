import { notFound } from "next/navigation";
import { SectionRenderer } from "@/components/cms/SectionRenderer";
import { getPage, getPublishedPageSlugs } from "@/lib/cms/queries";
import { pageMetadata } from "@/lib/cms/metadata";

export const revalidate = 300;
// Pages created later in the CMS render on first request, then are cached.
export const dynamicParams = true;

export async function generateStaticParams() {
  return (await getPublishedPageSlugs()).filter((s) => s !== "home").map((slug) => ({ slug }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  return pageMetadata(slug === "home" ? null : await getPage(slug), `/${slug}`);
}

export default async function CmsPage({ params }: Props) {
  const { slug } = await params;
  if (slug === "home") notFound();
  const page = await getPage(slug);
  if (!page) notFound();
  return (
    <main id="main">
      <SectionRenderer sections={page.sections} />
    </main>
  );
}
