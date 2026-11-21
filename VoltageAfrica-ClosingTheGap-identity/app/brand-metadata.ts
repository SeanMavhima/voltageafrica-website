/**
 * Spread into the root app/layout.tsx:
 *
 *   import { brandMetadata, brandViewport } from "./brand-metadata";
 *   export const metadata = { ...brandMetadata };
 *   export const viewport = brandViewport;
 *
 * In Vercel set NEXT_PUBLIC_SITE_URL to the production domain (e.g. https://voltageafrica.com),
 * so the social image resolves to an absolute URL — LinkedIn and WhatsApp require that.
 * If app/favicon.ico exists, delete it: Next.js serves it ahead of public/favicon.ico.
 */
import type { Metadata, Viewport } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const TITLE = "VoltageAfrica — Intelligent energy infrastructure for Africa";
const DESCRIPTION = "Solar microgrids, energy storage and smart energy management, closing Africa’s energy gap.";

export const brandMetadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: TITLE, template: "%s · VoltageAfrica" },
  description: DESCRIPTION,
  applicationName: "VoltageAfrica",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "16x16 32x32 48x48" },
      { url: "/brand/favicon.svg", type: "image/svg+xml" },
    ],
    apple: [{ url: "/brand/apple-touch-icon.png", sizes: "180x180" }],
  },
  manifest: "/brand/site.webmanifest",
  openGraph: {
    type: "website",
    siteName: "VoltageAfrica",
    title: TITLE,
    description: DESCRIPTION,
    url: "/",
    images: [{ url: "/brand/og-image.png", width: 1200, height: 630, alt: "VoltageAfrica — Closing Africa’s energy gap." }],
  },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION, images: ["/brand/og-image.png"] },
};

export const brandViewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FFFFFF" },
    { media: "(prefers-color-scheme: dark)", color: "#1F2326" },
  ],
};
