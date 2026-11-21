import type { Metadata, Viewport } from "next";
import { Fraunces, IBM_Plex_Mono, Instrument_Sans } from "next/font/google";
import { site } from "@/lib/site";
import { Providers } from "@/components/ui/Providers";
import { themeScript } from "@/lib/theme";
import { shareImage } from "@/lib/cms/metadata";
import "./globals.css";

const serif = Fraunces({ subsets: ["latin"], style: ["normal", "italic"], axes: ["SOFT", "opsz"], variable: "--font-serif-face", display: "swap" });
const sans = Instrument_Sans({ subsets: ["latin"], variable: "--font-sans-face", display: "swap" });
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-mono-face", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: site.title, template: "%s | VoltageAfrica" },
  description: site.description,
  applicationName: site.name,
  // "Closing the Gap" identity: favicon.svg follows the browser's light/dark theme.
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "16x16 32x32 48x48" },
      { url: "/brand/favicon.svg", type: "image/svg+xml" },
    ],
    apple: [{ url: "/brand/apple-touch-icon.png", sizes: "180x180" }],
  },
  keywords: [
    "VoltageAfrica",
    "solar microgrid",
    "rural electrification",
    "Zimbabwe",
    "Shurugwi",
    "energy access",
    "battery storage",
    "smart metering",
    "productive use of energy",
    "virtual power plant",
    "Africa energy technology",
  ],
  authors: [{ name: "VoltageAfrica" }],
  creator: "VoltageAfrica",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    siteName: site.name,
    title: site.title,
    description: site.description,
    locale: "en_GB",
    images: [shareImage],
  },
  twitter: { card: "summary_large_image", title: site.title, description: site.description, images: [shareImage.url] },
  robots: { index: true, follow: true },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f3efe5" },
    { media: "(prefers-color-scheme: dark)", color: "#15150f" },
  ],
  colorScheme: "light dark",
  width: "device-width",
  initialScale: 1,
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: site.name,
  url: site.url,
  logo: `${site.url}/brand/icon-512.png`,
  description: site.description,
  email: site.email,
  founder: { "@type": "Person", name: site.founder.name, sameAs: [site.founder.linkedin, site.founder.instagram, site.founder.facebook] },
  areaServed: { "@type": "Place", name: "Africa" },
  knowsAbout: ["Solar microgrids", "Energy storage", "Rural electrification", "Smart metering", "Distributed energy"],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // data-theme is set by themeScript before paint, so React must accept the DOM value.
    <html lang="en" data-theme="light" suppressHydrationWarning className={`${serif.variable} ${sans.variable} ${mono.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="grain">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
