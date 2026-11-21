import { notFound } from "next/navigation";
import { SectionRenderer } from "@/components/cms/SectionRenderer";
import { getPage } from "@/lib/cms/queries";
import { pageMetadata } from "@/lib/cms/metadata";

export const revalidate = 300;

export async function generateMetadata() {
  return pageMetadata(await getPage("home"), "/");
}

export default async function HomePage() {
  const page = await getPage("home");
  if (!page) notFound();
  return (
    <main id="main">
      <SectionRenderer sections={page.sections} />
    </main>
  );
}
