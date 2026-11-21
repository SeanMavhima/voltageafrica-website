/**
 * Collection registry: each content module, its table, form fields and list view.
 * Field `name` === database column. Image fields are stored as `<name>` uuid FKs.
 */
import type { Field } from "./fields";

export type CollectionKey = "timeline" | "publications" | "awards" | "projects" | "technology" | "principles" | "people" | "navigation";

export type CollectionDef = {
  key: CollectionKey;
  table: string;
  label: string;
  singular: string;
  description: string;
  fields: Field[];
  /** Columns shown in the list view: [field name, header]. */
  columns: [string, string][];
  /** Field used as the row title. */
  titleField: string;
  searchFields: string[];
  hasStatus: boolean;
  /** Optional fixed filter options shown above the list. */
  filter?: { field: string; label: string; options: { value: string; label: string }[] };
  /** Public paths to refresh after a change. */
  revalidate: string[];
};

const navLocations = [
  { value: "header", label: "Header" },
  { value: "footer", label: "Footer" },
  { value: "engage", label: "Get involved" },
];

const statusLabels = ["Prototyped", "Explored", "In design", "Planned", "Long-term"].map((v) => ({ value: v, label: v }));

export const collections: Record<CollectionKey, CollectionDef> = {
  timeline: {
    key: "timeline",
    table: "timeline_milestones",
    label: "Timeline & milestones",
    singular: "Milestone",
    description: "The journey timeline. Mark one milestone as 'upcoming' to feature it as the next milestone.",
    titleField: "title",
    searchFields: ["title", "description", "date_label"],
    hasStatus: true,
    columns: [["date_label", "Date"], ["title", "Title"], ["category", "Category"]],
    revalidate: ["/journey", "/"],
    fields: [
      { name: "title", label: "Title", kind: "text", required: true, max: 160 },
      { name: "date_label", label: "Date label", kind: "text", required: true, max: 40, help: "As displayed, e.g. 'Apr 2026' or 'Next'." },
      { name: "event_date", label: "Date", kind: "date", help: "Used for sorting new entries. Leave empty for upcoming milestones." },
      { name: "description", label: "Description", kind: "textarea", max: 800, rows: 4 },
      { name: "category", label: "Category", kind: "select", options: ["Build", "Research", "Engagement", "Recognition", "Programme", "Upcoming"].map((v) => ({ value: v, label: v })) },
      { name: "image_id", label: "Image", kind: "image" },
      { name: "image_position", label: "Image focal point", kind: "text", max: 20, help: "Optional CSS position, e.g. '50% 30%'." },
      { name: "link_url", label: "External link", kind: "url" },
      { name: "link_label", label: "Link label", kind: "text", max: 80 },
      { name: "is_upcoming", label: "Upcoming milestone (featured as 'Next')", kind: "boolean" },
      { name: "featured", label: "Featured", kind: "boolean" },
    ],
  },
  publications: {
    key: "publications",
    table: "publications",
    label: "Publications & media",
    singular: "Publication",
    description: "Press coverage, interviews, reports and articles. Links open in a new tab.",
    titleField: "headline",
    searchFields: ["headline", "outlet", "description"],
    hasStatus: true,
    columns: [["date_label", "Date"], ["outlet", "Outlet"], ["headline", "Headline"], ["category", "Category"]],
    revalidate: ["/impact"],
    fields: [
      { name: "outlet", label: "Publisher / outlet", kind: "text", required: true, max: 160 },
      { name: "headline", label: "Article headline", kind: "text", required: true, max: 240 },
      { name: "date_label", label: "Date label", kind: "text", max: 40, help: "As displayed, e.g. '3 May 2025'." },
      { name: "published_on", label: "Publication date", kind: "date" },
      { name: "url", label: "Link to the original", kind: "url", required: true },
      { name: "description", label: "Short description", kind: "textarea", max: 600 },
      { name: "category", label: "Category", kind: "select", options: ["News", "Feature", "Profile", "Interview", "Award", "Recognition", "Report"].map((v) => ({ value: v, label: v })) },
      { name: "cover_image_id", label: "Cover image", kind: "image", help: "Only use real imagery connected to the article. Without one, a typographic preview is shown." },
      { name: "featured", label: "Featured", kind: "boolean" },
    ],
  },
  awards: {
    key: "awards",
    table: "awards",
    label: "Awards & recognition",
    singular: "Award",
    description: "Awards, prizes and selections, shown on the Impact page.",
    titleField: "title",
    searchFields: ["title", "organisation", "location"],
    hasStatus: true,
    columns: [["date_label", "Date"], ["title", "Award"], ["organisation", "Organisation"]],
    revalidate: ["/impact"],
    fields: [
      { name: "title", label: "Award title", kind: "text", required: true, max: 200 },
      { name: "organisation", label: "Organisation", kind: "text", required: true, max: 160 },
      { name: "date_label", label: "Date label", kind: "text", max: 40 },
      { name: "award_date", label: "Date", kind: "date" },
      { name: "location", label: "Location", kind: "text", max: 120 },
      { name: "description", label: "Description", kind: "textarea", max: 800 },
      { name: "image_id", label: "Image or certificate", kind: "image" },
      { name: "url", label: "Supporting link", kind: "url" },
      { name: "featured", label: "Featured", kind: "boolean" },
    ],
  },
  projects: {
    key: "projects",
    table: "projects",
    label: "Projects",
    singular: "Project",
    description: "VoltageAfrica initiatives. Each published project gets its own page at /projects/<slug>.",
    titleField: "name",
    searchFields: ["name", "summary", "location"],
    hasStatus: true,
    columns: [["name", "Project"], ["stage", "Stage"], ["location", "Location"]],
    revalidate: ["/projects", "/"],
    fields: [
      { name: "name", label: "Project name", kind: "text", required: true, max: 160 },
      { name: "slug", label: "URL slug", kind: "text", required: true, max: 80, help: "Lowercase words separated by hyphens, e.g. shurugwi-pilot-hub." },
      { name: "summary", label: "Summary", kind: "textarea", max: 600 },
      { name: "body", label: "Detailed description", kind: "richtext" },
      { name: "stage", label: "Project stage", kind: "select", options: ["Concept", "Research", "In preparation", "Building", "Operational", "Completed"].map((v) => ({ value: v, label: v })) },
      { name: "location", label: "Location", kind: "text", max: 160 },
      { name: "cover_image_id", label: "Cover image", kind: "image" },
      { name: "categories", label: "Categories", kind: "tags" },
      { name: "featured", label: "Featured", kind: "boolean" },
    ],
  },
  technology: {
    key: "technology",
    table: "technology_items",
    label: "Technology",
    singular: "Technology item",
    description: "Energy-chain steps, capability register, productive uses and the 3D microgrid's component explanations.",
    titleField: "title",
    searchFields: ["title", "body", "key"],
    hasStatus: true,
    columns: [["kind", "Type"], ["title", "Title"], ["status_label", "Status"]],
    filter: {
      field: "kind",
      label: "Type",
      options: [
        { value: "approach_step", label: "Energy chain steps" },
        { value: "capability", label: "Capabilities" },
        { value: "productive_use", label: "Productive uses" },
        { value: "microgrid_component", label: "3D microgrid components" },
      ],
    },
    revalidate: ["/technology", "/microgrid", "/"],
    fields: [
      { name: "kind", label: "Type", kind: "select", required: true, options: [
        { value: "capability", label: "Capability (status register)" },
        { value: "approach_step", label: "Energy chain step" },
        { value: "productive_use", label: "Productive use" },
        { value: "microgrid_component", label: "3D microgrid component" },
      ] },
      { name: "key", label: "Key", kind: "text", required: true, max: 40, help: "Identifier used by diagrams (lowercase). For chain steps, 3D components and productive uses it selects the drawing." },
      { name: "title", label: "Title", kind: "text", required: true, max: 120 },
      { name: "kicker", label: "Eyebrow", kind: "text", max: 80 },
      { name: "body", label: "Description", kind: "textarea", max: 1200, rows: 4 },
      { name: "points", label: "Points", kind: "tags", help: "Bullet points (3D components)." },
      { name: "status_label", label: "Status label", kind: "select", options: [{ value: "", label: "—" }, ...statusLabels] },
      { name: "note", label: "Note", kind: "text", max: 200 },
      { name: "enables", label: "What it enables", kind: "text", max: 80 },
      { name: "image_id", label: "Image / diagram", kind: "image" },
    ],
  },
  principles: {
    key: "principles",
    table: "principles",
    label: "Principles",
    singular: "Principle",
    description: "Operating principles, shown in order on the About page.",
    titleField: "title",
    searchFields: ["title", "body"],
    hasStatus: true,
    columns: [["title", "Principle"], ["body", "Text"]],
    revalidate: ["/about"],
    fields: [
      { name: "title", label: "Principle", kind: "text", required: true, max: 120 },
      { name: "body", label: "Text", kind: "textarea", max: 600 },
    ],
  },
  people: {
    key: "people",
    table: "people",
    label: "Founder & team",
    singular: "Person",
    description: "The founder profile and team members.",
    titleField: "name",
    searchFields: ["name", "role", "country"],
    hasStatus: true,
    columns: [["name", "Name"], ["role", "Role"], ["country", "Country"]],
    revalidate: ["/about"],
    fields: [
      { name: "name", label: "Name", kind: "text", required: true, max: 120 },
      { name: "role", label: "Role", kind: "text", max: 120 },
      { name: "country", label: "Country", kind: "text", max: 80 },
      { name: "is_founder", label: "This is the founder profile", kind: "boolean", help: "Only one person can be the founder." },
      { name: "bio", label: "Biography", kind: "richtext" },
      { name: "quote", label: "Featured quote", kind: "textarea", max: 600 },
      { name: "quote_source_label", label: "Quote source", kind: "text", max: 160 },
      { name: "quote_source_url", label: "Quote source link", kind: "url" },
      { name: "image_id", label: "Portrait", kind: "image" },
      { name: "social_links", label: "Social links", kind: "list", itemLabel: "Link", titleField: "label", max: 8, fields: [
        { name: "label", label: "Network", kind: "select", options: ["LinkedIn", "Instagram", "Facebook", "X", "YouTube", "Website"].map((v) => ({ value: v, label: v })) },
        { name: "url", label: "Profile link", kind: "url", required: true },
      ] },
    ],
  },
  navigation: {
    key: "navigation",
    table: "navigation_items",
    label: "Navigation",
    singular: "Navigation link",
    description: "Header menu, footer links and the 'Get involved' links (mobile menu and footer). Drag to reorder; hide a link without deleting it.",
    titleField: "label",
    searchFields: ["label", "href"],
    hasStatus: false,
    columns: [["location", "Menu"], ["label", "Label"], ["href", "Destination"]],
    filter: { field: "location", label: "Menu", options: navLocations },
    revalidate: ["/"],
    fields: [
      { name: "label", label: "Label", kind: "text", required: true, max: 60 },
      { name: "href", label: "Destination", kind: "url", required: true, help: "A page path like /about, or a full https:// link." },
      { name: "location", label: "Menu", kind: "select", options: navLocations },
      { name: "is_external", label: "Opens another website (new tab)", kind: "boolean" },
      { name: "is_visible", label: "Visible", kind: "boolean" },
    ],
  },
};

export const collectionList = Object.values(collections);

export function isCollectionKey(k: string): k is CollectionKey {
  return k in collections;
}

/** Columns that hold media FKs, for joins and usage checks. */
export const imageColumns = (def: CollectionDef) => def.fields.filter((f) => f.kind === "image").map((f) => f.name);
