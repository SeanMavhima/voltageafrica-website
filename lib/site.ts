export const site = {
  name: "VoltageAfrica",
  title: "VoltageAfrica | Intelligent Energy Infrastructure for Africa",
  tagline: "Intelligent energy infrastructure for Africa.",
  description:
    "VoltageAfrica is building intelligent renewable energy infrastructure to expand rural electricity access, power productive communities, and connect the future of energy in Africa.",
  url: (process.env.NEXT_PUBLIC_SITE_URL || "https://www.voltageafrica.africa").replace(/\/$/, ""),
  email: "mavhimasean@gmail.com",
  founder: {
    name: "Sean Mavhima",
    linkedin: "https://www.linkedin.com/in/sean-mavhima/",
    facebook: "https://www.facebook.com/sean.mavhima.50/",
    instagram: "https://www.instagram.com/sean_mavhimaa/",
  },
} as const;

export const nav = [
  { href: "/vision", label: "Vision" },
  { href: "/technology", label: "Technology" },
  { href: "/microgrid", label: "Microgrid" },
  { href: "/energy-lab", label: "Energy Lab" },
  { href: "/pilot", label: "Shurugwi pilot" },
  { href: "/journey", label: "Journey" },
  { href: "/impact", label: "Impact" },
  { href: "/about", label: "About" },
] as const;

export const contactHref = "/contact";
