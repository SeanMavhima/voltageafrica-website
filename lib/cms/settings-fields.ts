import type { Field } from "./fields";

/** Site settings form (Settings page). */
export const settingsFormFields: Field[] = [
  { name: "site_name", label: "Site name", kind: "text", required: true, max: 80 },
  { name: "tagline", label: "Tagline", kind: "text", max: 160 },
  { name: "description", label: "Company description", kind: "textarea", max: 400, help: "Used as the default SEO description and in structured data." },
  { name: "contact_email", label: "Public contact email", kind: "text", max: 200, help: "Shown in the footer and contact section. Leave empty to hide it." },
  { name: "contact_phone", label: "Public phone number", kind: "text", max: 40, help: "Optional. Shown on the Contact page, including the country code." },
  { name: "contact_location", label: "Location", kind: "text", max: 120, help: "Optional, e.g. 'Harare, Zimbabwe · Kigali, Rwanda'. Shown on the Contact page." },
  { name: "nav_cta_label", label: "Menu button label", kind: "text", required: true, max: 40 },
  { name: "nav_cta_href", label: "Menu button destination", kind: "url", required: true },
  { name: "nav_secondary_label", label: "Secondary header link label", kind: "text", max: 40, help: "Quiet text link beside the menu button on large screens, e.g. 'Partner with us'. Leave empty to hide it." },
  { name: "nav_secondary_href", label: "Secondary header link destination", kind: "url" },
  { name: "footer_statement", label: "Footer brand statement", kind: "accent", max: 160 },
  { name: "footer_copyright", label: "Copyright line", kind: "text", max: 160, help: "{year} is replaced by the current year." },
  { name: "footer_regions", label: "Footer regions", kind: "text", max: 120 },
  { name: "social_links", label: "Social links", kind: "list", itemLabel: "Link", titleField: "label", max: 8, fields: [
    { name: "label", label: "Network", kind: "select", options: ["LinkedIn", "Instagram", "Facebook", "X", "YouTube", "Website"].map((v) => ({ value: v, label: v })) },
    { name: "url", label: "Link", kind: "url", required: true },
  ] },
  { name: "default_seo_title", label: "Default SEO title", kind: "text", max: 120, help: "Used for the homepage and when a page has no SEO title." },
  { name: "default_seo_description", label: "Default SEO description", kind: "textarea", max: 300 },
];
