import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const supabaseHost = (() => {
  try {
    return process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname : null;
  } catch {
    return null;
  }
})();

// Canonical URLs, the sitemap, robots.txt and social previews are built from NEXT_PUBLIC_SITE_URL.
// A production build that still points at localhost would publish broken links to search engines.
if (process.env.NODE_ENV === "production" && /localhost|127\.0\.0\.1/.test(process.env.NEXT_PUBLIC_SITE_URL ?? "")) {
  console.warn(
    "\n⚠  NEXT_PUBLIC_SITE_URL is set to a localhost address. Set it to the public domain (e.g. https://www.voltageafrica.africa) in the hosting environment before deploying.\n",
  );
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Allows an isolated build directory (used by the local test harness).
  distDir: process.env.NEXT_DIST_DIR || ".next",
  poweredByHeader: false,
  images: {
    formats: ["image/avif", "image/webp"],
    qualities: [75, 90],
    // Uploaded media is served from Supabase Storage.
    remotePatterns: supabaseHost ? [{ protocol: "https", hostname: supabaseHost, pathname: "/storage/v1/object/public/**" }] : [],
    deviceSizes: [640, 828, 1080, 1280, 1600, 1920, 2400, 3200, 3840],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
