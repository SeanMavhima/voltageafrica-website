"use client";

/**
 * Heavy client components, code-split so their JavaScript downloads only on pages that render them.
 *
 * Every CMS page shares one route (app/(site)/[slug]) and SectionRenderer can render any section,
 * so a plain import puts every section's client code in every page's bundle. A server component's
 * dynamic() does not split client code (see Next's lazy-loading guide), so the split happens here.
 * Server rendering is kept (no ssr: false): the HTML is identical and only hydration waits for the chunk.
 */
import dynamic from "next/dynamic";

/** Simulator, optimiser and copilot (~230 KB). */
export const EnergyLab = dynamic(() => import("@/components/energy-lab/EnergyLab").then((m) => m.EnergyLab));

/** Forms pull in zod validation (~100 KB). */
export const ContactForm = dynamic(() => import("@/components/contact/ContactForm").then((m) => m.ContactForm));
export const PartnershipForm = dynamic(() => import("@/components/engagement/PartnershipForm").then((m) => m.PartnershipForm));
export const SupportForm = dynamic(() => import("@/components/engagement/SupportForm").then((m) => m.SupportForm));
