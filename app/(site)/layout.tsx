import { draftMode } from "next/headers";
import { Navigation } from "@/components/navigation/Navigation";
import { Footer } from "@/components/footer/Footer";
import { PreviewBanner } from "@/components/cms/PreviewBanner";
import { getCreditedMedia, getNavigation, getSiteSettings } from "@/lib/cms/queries";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [settings, header, footer, engage, credits, draft] = await Promise.all([getSiteSettings(), getNavigation("header"), getNavigation("footer"), getNavigation("engage"), getCreditedMedia(), draftMode()]);
  return (
    <>
      {draft.isEnabled && <PreviewBanner />}
      <Navigation items={header} cta={settings.navCta} secondary={settings.navSecondary} engage={engage} />
      {children}
      <Footer settings={settings} links={footer} engage={engage} credits={credits} />
    </>
  );
}
