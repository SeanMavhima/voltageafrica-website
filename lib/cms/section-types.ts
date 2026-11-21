/**
 * Page-builder section registry (shared by admin and site).
 *
 * Adding content to an existing type needs no code. To add a brand-new visual
 * type: add an entry here, create its component, and register it in
 * components/cms/SectionRenderer.tsx.
 */
import type { Field } from "./fields";

export type SectionGroup = "Signature" | "Story" | "Engagement" | "Data-driven" | "Media" | "Layout";

export type SectionTypeDef = {
  type: string;
  label: string;
  description: string;
  group: SectionGroup;
  fields: Field[];
  /** Collections the section renders from the database (shown as a hint in the editor). */
  uses?: string;
  /** Whether the generic background setting applies. */
  themeable?: boolean;
};

const kicker: Field = { name: "kicker", label: "Eyebrow", kind: "text", max: 80, help: "Small label above the headline." };
const headline = (required = true): Field => ({
  name: "headline",
  label: "Headline",
  kind: "accent",
  required,
  max: 200,
  help: "Wrap words in *asterisks* to set them as the italic accent, e.g. Energy that *earns its keep.*",
});
const intro: Field = { name: "intro", label: "Supporting text", kind: "textarea", max: 800, rows: 3 };

/** Wording of an engagement form. Empty fields fall back to sensible defaults. */
const formCopyFields: Field[] = [
  { name: "formTitle", label: "Form: title", kind: "text", max: 120 },
  { name: "formDescription", label: "Form: description", kind: "textarea", max: 400, rows: 2 },
  { name: "submitLabel", label: "Form: button label", kind: "text", max: 40 },
  { name: "privacyNote", label: "Form: privacy note", kind: "textarea", max: 300, rows: 2 },
  { name: "successTitle", label: "Confirmation: title", kind: "text", max: 80 },
  { name: "successMessage", label: "Confirmation: message", kind: "textarea", max: 400, rows: 3 },
  { name: "nextStep", label: "Confirmation: next-step button", kind: "link", help: "Where to send people after they submit." },
];
/** A large editorial photograph ("photo plate") with caption; credit comes from the media library. */
const photoFields: Field[] = [
  { name: "image", label: "Photo plate", kind: "image", help: "Large photograph shown across the page. Use real VoltageAfrica photography or credited landscapes, never images that suggest an installation we have not built." },
  { name: "imageCaption", label: "Photo caption", kind: "text", max: 200, help: "Leave empty to use the caption from the media library." },
  { name: "imagePosition", label: "Photo focal point", kind: "text", max: 20, help: "Optional CSS position, e.g. '50% 30%' to keep faces in frame." },
];
const consentField: Field ={ name: "consentLabel", label: "Form: consent checkbox text", kind: "text", max: 200 };

export const backgroundOptions = [
  { value: "parchment", label: "Parchment" },
  { value: "paper", label: "White" },
  { value: "forest", label: "Forest green" },
  { value: "charcoal", label: "Charcoal" },
];

export const settingsFields: Field[] = [
  { name: "background", label: "Background", kind: "select", options: [{ value: "", label: "Default for this section" }, ...backgroundOptions] },
  { name: "anchor", label: "Anchor ID", kind: "text", max: 60, help: "Lets links jump here, e.g. 'approach' for /technology#approach. Lowercase letters, numbers and hyphens." },
];

export const sectionTypes: SectionTypeDef[] = [
  // ─── Signature ───────────────────────────────────────────────────
  {
    type: "hero",
    label: "Cinematic hero (film + 3D world)",
    description: "Full-screen opening with two experiences: a five-scene photographic film and an interactive 3D world of a community energy system. Visitors switch with the 3D toggle.",
    group: "Signature",
    uses: "Technology → 3D microgrid components (chapter texts in 3D mode)",
    fields: [
      kicker,
      headline(),
      { name: "body", label: "Supporting statement", kind: "textarea", max: 600, rows: 3 },
      { name: "primaryCta", label: "Primary button", kind: "link" },
      { name: "secondaryCta", label: "Secondary link", kind: "link" },
      { name: "scenes", label: "Film scenes (shown in order)", kind: "list", itemLabel: "Scene", titleField: "title", max: 8, fields: [
        { name: "image", label: "Image", kind: "image", required: true, help: "Landscape image, at least 2400 px wide. Credits come from the media library. Label renders as illustrative in the caption." },
        { name: "title", label: "Scene title", kind: "text", max: 40, help: "Shown under the progress bar, e.g. 'The land'." },
        { name: "caption", label: "Caption", kind: "text", max: 220, help: "Say what the image shows. Mark renders as 'Illustrative render'." },
        { name: "position", label: "Focal point", kind: "text", max: 20, help: "CSS position, e.g. '50% 40%'. Keeps the subject in frame on phones." },
        { name: "motion", label: "Camera move", kind: "select", options: [{ value: "in", label: "Slow push in" }, { value: "out", label: "Slow pull back" }, { value: "left", label: "Drift left" }, { value: "right", label: "Drift right" }, { value: "rise", label: "Rise" }] },
      ] },
      { name: "sceneDuration", label: "Seconds per scene", kind: "number", min: 5, max: 20, step: 1, help: "How long each scene holds before the next one dissolves in (5–20)." },
      { name: "enable3d", label: "Offer the 3D experience", kind: "boolean", help: "Shows the Film / 3D toggle. Devices without WebGL always see the film." },
      { name: "defaultMode", label: "Default experience", kind: "select", options: [{ value: "film", label: "Film (recommended: fastest first impression)" }, { value: "3d", label: "3D world (capable desktops only)" }] },
      { name: "overlay", label: "Overlay intensity", kind: "number", min: 0, max: 100, step: 5, help: "Darkens the imagery behind the text (0–100)." },
      { name: "image", label: "Fallback image", kind: "image", help: "Used if no scenes are set." },
      { name: "showScrollCue", label: "Show scroll cue", kind: "boolean" },
    ],
  },
  {
    type: "page_intro",
    label: "Page opening",
    description: "Large page title, one-sentence purpose and an 'On this page' index.",
    group: "Signature",
    fields: [
      kicker,
      headline(),
      intro,
      { name: "index", label: "On this page", kind: "list", itemLabel: "Link", titleField: "label", fields: [
        { name: "label", label: "Label", kind: "text", max: 80, required: true },
        { name: "anchor", label: "Section anchor ID", kind: "text", max: 60, required: true, help: "Must match the Anchor ID of a section on this page." },
      ] },
      ...photoFields,
    ],
  },
  {
    type: "microgrid_exhibit",
    label: "3D microgrid exhibit",
    description: "The interactive 3D community microgrid, presented as a gallery exhibit.",
    group: "Signature",
    uses: "Technology → microgrid components",
    fields: [kicker, headline(), intro, { name: "cta", label: "Button", kind: "link" }, { name: "disclaimer", label: "Disclaimer", kind: "textarea", max: 400, rows: 2 }],
  },
  {
    type: "energy_lab",
    label: "AI Energy Lab (interactive simulator)",
    description: "The full Energy Lab: live energy-flow simulation, What-if scenario lab, before/after optimisation, explainable recommendations, 24-hour forecast, resilience tests and the AI copilot. Physics and optimisation live in code (lib/energy-lab); this section controls copy, availability and starting values.",
    group: "Signature",
    uses: "Simulation engine in lib/energy-lab (version-controlled and tested)",
    fields: [
      kicker,
      headline(false),
      intro,
      { name: "paused", label: "Temporarily close the lab", kind: "boolean", help: "Shows the notice below instead of the simulator. To remove the lab entirely, unpublish the page." },
      { name: "pausedMessage", label: "Notice while closed", kind: "textarea", max: 300, rows: 2 },
      { name: "disclaimer", label: "Simulation disclaimer", kind: "textarea", max: 600, rows: 3, help: "Shown under the introduction. Keep it clear that everything is simulated." },
      { name: "features", label: "Feature descriptions", kind: "list", itemLabel: "Feature", titleField: "title", max: 3, fields: [
        { name: "title", label: "Title", kind: "text", max: 60, required: true },
        { name: "body", label: "Description", kind: "textarea", max: 200, rows: 2 },
      ] },
      { name: "defaultPreset", label: "Scenario shown first", kind: "select", options: [
        { value: "sunny", label: "01 · Sunny day" },
        { value: "cloudy-afternoon", label: "02 · Cloudy afternoon" },
        { value: "evening-peak", label: "03 · Evening peak" },
        { value: "battery-stress", label: "04 · Battery stress" },
        { value: "growing", label: "05 · Growing community" },
        { value: "productive", label: "06 · Productive energy" },
      ] },
      { name: "defaultLevel", label: "Default level of detail", kind: "select", options: [{ value: "explore", label: "Explore (everyone)" }, { value: "engineer", label: "Engineer (technical)" }] },
      { name: "presets", label: "Scenario presets: wording and visibility", kind: "list", itemLabel: "Preset", titleField: "preset", max: 6, fields: [
        { name: "preset", label: "Preset", kind: "select", required: true, options: [
          { value: "sunny", label: "Sunny day" },
          { value: "cloudy-afternoon", label: "Cloudy afternoon" },
          { value: "evening-peak", label: "Evening peak" },
          { value: "battery-stress", label: "Battery stress" },
          { value: "growing", label: "Growing community" },
          { value: "productive", label: "Productive energy" },
        ] },
        { name: "title", label: "Title (optional override)", kind: "text", max: 60 },
        { name: "summary", label: "Summary (optional override)", kind: "textarea", max: 200, rows: 2 },
        { name: "hidden", label: "Hide this preset", kind: "boolean" },
      ] },
      { name: "households", label: "Starting value: households", kind: "number", min: 10, max: 200, step: 5, help: "10–200. Leave at 0 or empty for the engine default (60)." },
      { name: "solarKwp", label: "Starting value: solar (kWp)", kind: "number", min: 0, max: 120, step: 1, help: "5–120. 0 = engine default (30 kWp)." },
      { name: "batteryKwh", label: "Starting value: battery (kWh)", kind: "number", min: 0, max: 400, step: 5, help: "10–400. 0 = engine default (80 kWh)." },
      { name: "reservePct", label: "Starting value: clinic reserve (%)", kind: "number", min: 0, max: 60, step: 5, help: "10–60. 0 = engine default (25%)." },
      { name: "education", label: "Educational notes (Methods section)", kind: "list", itemLabel: "Note", titleField: "title", max: 6, fields: [
        { name: "title", label: "Title", kind: "text", max: 80, required: true },
        { name: "body", label: "Text", kind: "textarea", max: 600, rows: 3 },
      ] },
      { name: "copilotOff", label: "Turn off the AI copilot", kind: "boolean", help: "Hides the copilot. The API key itself is a server environment variable and is never stored in the CMS." },
      { name: "copilotIntro", label: "Copilot introduction", kind: "textarea", max: 500, rows: 3 },
      { name: "suggestedQuestions", label: "Suggested questions", kind: "tags", placeholder: "Why is the battery discharging?", help: "Up to 8. Shown when the copilot opens." },
    ],
  },
  // ─── Story ───────────────────────────────────────────────────────
  {
    type: "statement",
    label: "Statement",
    description: "One large sentence with a source and a link.",
    group: "Story",
    themeable: true,
    fields: [
      { name: "text", label: "Statement", kind: "accent", required: true, max: 400, help: "Wrap the accent phrase in *asterisks*." },
      { name: "sourceLabel", label: "Source label", kind: "text", max: 120 },
      { name: "sourceUrl", label: "Source link", kind: "url" },
      { name: "cta", label: "Link", kind: "link" },
    ],
  },
  {
    type: "challenge",
    label: "The challenge (photo + figures)",
    description: "Full-bleed photographic statement followed by sourced statistics and 'beyond lighting' points.",
    group: "Story",
    fields: [
      kicker,
      { name: "interlude", label: "Statement over the photo", kind: "accent", required: true, max: 200 },
      { name: "body", label: "Paragraph", kind: "textarea", max: 800 },
      { name: "image", label: "Photograph", kind: "image", required: true },
      { name: "stats", label: "Statistics (first is shown large)", kind: "list", itemLabel: "Statistic", titleField: "value", max: 8, fields: [
        { name: "value", label: "Value", kind: "text", required: true, max: 20 },
        { name: "unit", label: "Unit", kind: "text", max: 30 },
        { name: "label", label: "Description", kind: "textarea", required: true, max: 300 },
        { name: "source", label: "Source", kind: "text", required: true, max: 200, help: "Only publish statistics with a verifiable source." },
        { name: "sourceUrl", label: "Source link", kind: "url" },
      ] },
      { name: "beyondKicker", label: "Points: eyebrow", kind: "text", max: 80 },
      { name: "beyondTitle", label: "Points: headline", kind: "textarea", max: 200, rows: 2 },
      { name: "beyond", label: "Points", kind: "list", itemLabel: "Point", titleField: "title", max: 12, fields: [
        { name: "title", label: "Title", kind: "text", required: true, max: 60 },
        { name: "body", label: "Text", kind: "textarea", max: 300 },
      ] },
    ],
  },
  {
    type: "approach",
    label: "Energy chain (approach)",
    description: "Interactive schematic: Sun → Generation → Storage → Intelligence → Distribution → Community.",
    group: "Story",
    uses: "Technology → approach steps",
    fields: [
      kicker,
      headline(),
      intro,
      { name: "figureImage", label: "Figure photograph", kind: "image" },
      { name: "figureCaption", label: "Figure caption", kind: "text", max: 200 },
      { name: "figureYear", label: "Figure year", kind: "text", max: 10 },
    ],
  },
  {
    type: "future",
    label: "Future stages (scroll story)",
    description: "Scroll-driven network diagram that grows stage by stage.",
    group: "Story",
    fields: [
      kicker,
      headline(),
      intro,
      { name: "stages", label: "Stages (up to 5)", kind: "list", itemLabel: "Stage", titleField: "title", max: 5, fields: [
        { name: "title", label: "Title", kind: "text", required: true, max: 80 },
        { name: "horizon", label: "Horizon / status", kind: "text", max: 80 },
        { name: "body", label: "Text", kind: "textarea", max: 400 },
      ] },
    ],
  },
  {
    type: "pilot",
    label: "Pilot project (survey sheet)",
    description: "Concept diagram, research figures, community findings, proposed hub and stage track.",
    group: "Story",
    fields: [
      kicker,
      headline(),
      { name: "status", label: "Status badge", kind: "text", max: 80 },
      intro,
      { name: "villages", label: "Villages on the diagram", kind: "tags", placeholder: "Add a village and press Enter" },
      { name: "diagramCaption", label: "Diagram caption", kind: "text", max: 120 },
      { name: "researchTitle", label: "Research: eyebrow", kind: "text", max: 120 },
      { name: "research", label: "Research figures", kind: "list", itemLabel: "Figure", titleField: "value", max: 8, fields: [
        { name: "value", label: "Value", kind: "text", required: true, max: 12 },
        { name: "label", label: "Label", kind: "text", required: true, max: 120 },
      ] },
      { name: "heardTitle", label: "Findings: eyebrow", kind: "text", max: 120 },
      { name: "heard", label: "Findings", kind: "list", itemLabel: "Finding", titleField: "text", max: 10, fields: [{ name: "text", label: "Finding", kind: "textarea", required: true, max: 300 }] },
      { name: "note", label: "Footnote", kind: "text", max: 200 },
      { name: "hubTitle", label: "Proposed hub: title", kind: "text", max: 80 },
      { name: "hubNote", label: "Proposed hub: note", kind: "text", max: 120 },
      { name: "hub", label: "Proposed hub elements", kind: "list", itemLabel: "Element", titleField: "title", max: 8, fields: [
        { name: "title", label: "Title", kind: "text", required: true, max: 60 },
        { name: "body", label: "Text", kind: "textarea", max: 200 },
      ] },
      { name: "stagesTitle", label: "Stages: eyebrow", kind: "text", max: 80 },
      { name: "stages", label: "Development stages", kind: "list", itemLabel: "Stage", titleField: "title", max: 8, fields: [
        { name: "title", label: "Title", kind: "text", required: true, max: 80 },
        { name: "status", label: "Status", kind: "select", options: [{ value: "Completed", label: "Completed" }, { value: "Next", label: "Next" }, { value: "Upcoming", label: "Upcoming" }] },
        { name: "body", label: "Text", kind: "textarea", max: 200 },
      ] },
    ],
  },
  {
    type: "founder",
    label: "Founder & team",
    description: "Pull quote, founder story, portrait, social links and the team list.",
    group: "Story",
    uses: "People (founder & team)",
    fields: [kicker, headline(), { name: "showTeam", label: "Show the team list", kind: "boolean" }, { name: "teamTitle", label: "Team heading", kind: "text", max: 60 }],
  },
  {
    type: "contact",
    label: "Contact form",
    description: "Contact details, links to the other ways to engage, and the working contact form. Submissions arrive in the Engagement Inbox.",
    group: "Engagement",
    fields: [
      kicker,
      headline(),
      intro,
      { name: "audiences", label: "Who we want to hear from (optional tags)", kind: "tags" },
      { name: "detailsTitle", label: "Contact details: heading", kind: "text", max: 80, help: "Email, phone and location come from Site settings → Contact & social." },
      { name: "pathwaysTitle", label: "Other ways to engage: heading", kind: "text", max: 80 },
      { name: "pathways", label: "Other ways to engage", kind: "list", itemLabel: "Link", titleField: "title", max: 4, fields: [
        { name: "title", label: "Title", kind: "text", required: true, max: 60 },
        { name: "body", label: "Line", kind: "text", max: 120 },
        { name: "href", label: "Destination", kind: "url", required: true },
      ] },
      ...photoFields,
      ...formCopyFields,
    ],
  },
  {
    type: "act",
    label: "Story act (homepage chapter)",
    description: "A cinematic chapter of the homepage story: Reality (full-bleed photo + sourced figures), Split (idea + photographs), Register (capabilities with honest status), Mosaic (photos + points) or Invitation (full-screen closing).",
    group: "Signature",
    uses: "Technology → capabilities (Register layout)",
    fields: [
      { name: "layout", label: "Layout", kind: "select", required: true, options: [
        { value: "reality", label: "Reality: full-bleed photograph + figures" },
        { value: "split", label: "Split: text beside photographs" },
        { value: "register", label: "Register: capability status (from Technology)" },
        { value: "mosaic", label: "Mosaic: three photographs + points" },
        { value: "invitation", label: "Invitation: full-screen closing" },
      ] },
      { name: "numeral", label: "Act numeral", kind: "text", max: 6, help: "Roman numeral, e.g. I, II, III. Leave empty to hide." },
      kicker,
      headline(),
      { name: "body", label: "Text", kind: "textarea", max: 900, rows: 4 },
      { name: "image", label: "Main photograph", kind: "image" },
      { name: "imageCaption", label: "Photo caption", kind: "text", max: 220, help: "Say what it shows. Mark renders as 'Illustrative render'." },
      { name: "imagePosition", label: "Photo focal point", kind: "text", max: 20 },
      { name: "images", label: "More photographs (Split: 1 inset · Mosaic: up to 3)", kind: "list", itemLabel: "Photo", titleField: "caption", max: 3, fields: [
        { name: "image", label: "Image", kind: "image", required: true },
        { name: "caption", label: "Caption", kind: "text", max: 200 },
      ] },
      { name: "stats", label: "Figures (Reality)", kind: "list", itemLabel: "Figure", titleField: "value", max: 3, fields: [
        { name: "value", label: "Value", kind: "text", required: true, max: 20 },
        { name: "unit", label: "Unit", kind: "text", max: 30 },
        { name: "label", label: "Description", kind: "textarea", required: true, max: 300 },
        { name: "source", label: "Source", kind: "text", required: true, max: 200, help: "Only publish figures with a verifiable source." },
        { name: "sourceUrl", label: "Source link", kind: "url" },
      ] },
      { name: "points", label: "Points (Split · Mosaic)", kind: "list", itemLabel: "Point", titleField: "title", max: 9, fields: [
        { name: "title", label: "Title", kind: "text", required: true, max: 80 },
        { name: "body", label: "Text", kind: "textarea", max: 300 },
      ] },
      { name: "links", label: "Pathways (Invitation)", kind: "list", itemLabel: "Pathway", titleField: "title", max: 3, fields: [
        { name: "title", label: "Title", kind: "text", required: true, max: 60 },
        { name: "body", label: "Text", kind: "textarea", max: 200 },
        { name: "href", label: "Destination", kind: "url", required: true },
      ] },
      { name: "cta", label: "Button", kind: "link" },
      { name: "note", label: "Small print", kind: "textarea", max: 400, rows: 2 },
    ],
  },
  {
    type: "key_facts",
    label: "Key facts (at a glance)",
    description: "A ruled ledger of the few verifiable facts an evaluator looks for first: stage, research, team, recognition.",
    group: "Engagement",
    themeable: true,
    fields: [
      { name: "kicker", label: "Eyebrow", kind: "text", max: 80, help: "Defaults to 'At a glance'." },
      { name: "headline", label: "Headline (optional)", kind: "accent", max: 160 },
      { name: "items", label: "Facts", kind: "list", itemLabel: "Fact", titleField: "label", max: 9, fields: [
        { name: "label", label: "Label", kind: "text", required: true, max: 40, help: "e.g. 'First pilot hub'." },
        { name: "value", label: "Value", kind: "text", required: true, max: 24, help: "Short and verifiable, e.g. 'In preparation' or '5 villages'." },
        { name: "detail", label: "Detail", kind: "text", max: 140 },
        { name: "href", label: "Link (optional)", kind: "url" },
      ] },
      { name: "note", label: "Small print", kind: "textarea", max: 300, rows: 2 },
    ],
  },
  {
    type: "downloads",
    label: "Downloads (press & funder kit)",
    description: "Grouped list of documents, brand files and photographs to download. Leave a file link empty to offer it 'on request' by email.",
    group: "Engagement",
    themeable: true,
    fields: [
      kicker,
      headline(),
      intro,
      { name: "items", label: "Files", kind: "list", itemLabel: "File", titleField: "title", max: 24, fields: [
        { name: "group", label: "Group", kind: "text", max: 40, help: "e.g. Documents, Brand, Photographs." },
        { name: "title", label: "Title", kind: "text", required: true, max: 100 },
        { name: "description", label: "Description", kind: "text", max: 200 },
        { name: "href", label: "File link", kind: "url", help: "A site path (e.g. /documents/report.pdf), or a file uploaded to the Media library. Leave empty to offer it on request by email." },
        { name: "meta", label: "Format & size", kind: "text", max: 40, help: "e.g. 'PDF · 216 KB'." },
      ] },
      { name: "requestSubject", label: "Email subject for requests", kind: "text", max: 80 },
      { name: "note", label: "Small print", kind: "textarea", max: 400, rows: 2 },
    ],
  },
  {
    type: "boilerplate",
    label: "About texts (copy-ready)",
    description: "Ready-to-use descriptions of VoltageAfrica in different lengths, each with a copy button, plus the press contact and a print button.",
    group: "Engagement",
    themeable: true,
    fields: [
      kicker,
      headline(),
      intro,
      { name: "blocks", label: "Texts", kind: "list", itemLabel: "Text", titleField: "label", max: 6, fields: [
        { name: "label", label: "Label", kind: "text", required: true, max: 60, help: "e.g. 'One line', 'About, 50 words'." },
        { name: "text", label: "Text", kind: "textarea", required: true, max: 2000, rows: 5 },
      ] },
      { name: "contactTitle", label: "Contact: heading", kind: "text", max: 60 },
      { name: "contactNote", label: "Contact: note", kind: "text", max: 200, help: "The email address comes from Site settings." },
    ],
  },
  {
    type: "partnership",
    label: "Partner with us",
    description: "Partnership invitation, the kinds of partners we work with, and the working partnership form.",
    group: "Engagement",
    fields: [
      kicker,
      headline(),
      intro,
      { name: "body", label: "Supporting text", kind: "textarea", max: 1000, rows: 4 },
      { name: "partnerTypesTitle", label: "Partner types: heading", kind: "text", max: 80 },
      { name: "partnerTypes", label: "Partner types", kind: "tags", placeholder: "Add a partner type and press Enter" },
      ...photoFields,
      ...formCopyFields,
      consentField,
    ],
  },
  {
    type: "support",
    label: "Support / contribute",
    description: "Support invitation, the areas support goes to, the 'not a payment' notice and the working support-inquiry form.",
    group: "Engagement",
    fields: [
      kicker,
      headline(),
      intro,
      { name: "body", label: "Supporting text", kind: "textarea", max: 1000, rows: 4 },
      { name: "areasTitle", label: "Support areas: heading", kind: "text", max: 80 },
      { name: "areas", label: "Support areas", kind: "list", itemLabel: "Area", titleField: "title", max: 10, fields: [
        { name: "title", label: "Title", kind: "text", required: true, max: 80 },
        { name: "body", label: "Text", kind: "textarea", max: 240 },
      ] },
      { name: "noticeTitle", label: "Notice: heading", kind: "text", max: 80 },
      { name: "notice", label: "Notice: how this works", kind: "textarea", max: 800, rows: 4, help: "Keep this accurate: the form records an inquiry. It does not take payments or donations." },
      { name: "paymentNote", label: "Note above the button", kind: "textarea", max: 300, rows: 2 },
      ...photoFields,
      ...formCopyFields,
      consentField,
    ],
  },
  {
    type: "donate",
    label: "Donate / fund the pilot",
    description: "Forest-green fundraising band: donate button (to your payment page), optional goal bar and gift tiers. Falls back to the pledge form until a payment link is set.",
    group: "Engagement",
    fields: [
      kicker,
      headline(),
      intro,
      { name: "donateUrl", label: "Payment page link", kind: "url", help: "Your donation page at a payment provider (PayPal, Stripe Payment Link, Paystack, Flutterwave, GoFundMe…), starting with https://. Card details are only ever entered there, never on this site. Leave empty and the button becomes 'Pledge your support', opening the support form." },
      { name: "donateLabel", label: "Donate button label", kind: "text", max: 40 },
      { name: "methodsNote", label: "Payment methods note", kind: "text", max: 160, help: "Shown under the button when a link is set, e.g. 'Card, PayPal or mobile money · processed securely by Paystack'." },
      { name: "pledgeLabel", label: "Pledge button label (no link yet)", kind: "text", max: 40 },
      { name: "noLinkNote", label: "Note while there is no payment link", kind: "textarea", max: 300, rows: 2 },
      { name: "otherWaysLabel", label: "Secondary link label", kind: "text", max: 60, help: "Links to the support form below for equipment, expertise and partnerships." },
      { name: "goalAmount", label: "Funding goal", kind: "number", min: 0, help: "Leave empty or 0 to hide the goal bar. Use only real, current figures." },
      { name: "raisedAmount", label: "Raised so far", kind: "number", min: 0, help: "Funds received or firmly committed. Update it as gifts arrive." },
      { name: "currency", label: "Currency code", kind: "text", max: 3, placeholder: "USD" },
      { name: "goalLabel", label: "Goal: what it is for", kind: "text", max: 120 },
      { name: "goalUpdated", label: "Goal: last updated", kind: "text", max: 40, help: "e.g. 'June 2026'. Shown next to the figures so visitors can trust them." },
      { name: "tiersTitle", label: "Gift tiers: heading", kind: "text", max: 80 },
      { name: "tiers", label: "Gift tiers", kind: "list", itemLabel: "Tier", titleField: "title", max: 4, help: "Optional. Each tier says what a specific amount pays for. Hidden when empty.", fields: [
        { name: "amount", label: "Amount", kind: "number", required: true, min: 1 },
        { name: "title", label: "What it pays for", kind: "text", required: true, max: 80 },
        { name: "body", label: "Detail", kind: "textarea", max: 200 },
      ] },
      { name: "trustTitle", label: "Transparency: heading", kind: "text", max: 80 },
      { name: "trustNote", label: "Transparency: text", kind: "textarea", max: 500, rows: 3 },
    ],
  },
  {
    type: "engagement_paths",
    label: "Engagement pathways",
    description: "Three-column call to action: partner, support, contact. Place it on any page.",
    group: "Engagement",
    themeable: true,
    fields: [
      kicker,
      headline(),
      intro,
      { name: "items", label: "Pathways", kind: "list", itemLabel: "Pathway", titleField: "title", max: 3, fields: [
        { name: "title", label: "Title", kind: "text", required: true, max: 60 },
        { name: "body", label: "Text", kind: "textarea", max: 240 },
        { name: "label", label: "Link label", kind: "text", max: 40 },
        { name: "href", label: "Destination", kind: "url", required: true },
      ] },
    ],
  },
  {
    type: "cta_band",
    label: "Call to action band",
    description: "Forest-green closing band with a button.",
    group: "Story",
    themeable: true,
    fields: [kicker, headline(), { name: "body", label: "Text", kind: "textarea", max: 400 }, { name: "primaryCta", label: "Button", kind: "link" }, { name: "showEmail", label: "Show contact email", kind: "boolean" }],
  },
  {
    type: "next_page",
    label: "Next-page link",
    description: "Large 'Next' link that leads visitors onward.",
    group: "Layout",
    fields: [
      { name: "kicker", label: "Eyebrow", kind: "text", max: 40 },
      { name: "title", label: "Title", kind: "text", required: true, max: 80 },
      { name: "line", label: "Line", kind: "text", max: 160 },
      { name: "href", label: "Destination", kind: "url", required: true },
    ],
  },
  // ─── Data-driven ─────────────────────────────────────────────────
  {
    type: "intelligence",
    label: "Intelligence console & register",
    description: "Simulated energy dashboard and the capability register.",
    group: "Data-driven",
    uses: "Technology → capabilities",
    fields: [kicker, headline(), intro, { name: "disclaimer", label: "Dashboard disclaimer", kind: "textarea", max: 400 }, { name: "labCta", label: "Energy Lab link", kind: "link", help: "Link under the console, e.g. 'Open the AI Energy Lab' → /energy-lab. Leave empty to hide." }, { name: "registerTitle", label: "Register heading", kind: "text", max: 120 }, { name: "footnote", label: "Footnote", kind: "textarea", max: 400 }],
  },
  {
    type: "productive",
    label: "Productive energy plates",
    description: "Technical plates for each productive use, the energy-to-income chain and revenue streams.",
    group: "Data-driven",
    uses: "Technology → productive uses",
    fields: [
      kicker,
      headline(),
      intro,
      { name: "chain", label: "Energy → income chain", kind: "list", itemLabel: "Step", titleField: "title", max: 6, fields: [
        { name: "title", label: "Title", kind: "text", required: true, max: 30 },
        { name: "body", label: "Text", kind: "text", max: 80 },
      ] },
      { name: "revenueKicker", label: "Revenue: eyebrow", kind: "text", max: 80 },
      { name: "revenueTitle", label: "Revenue: headline", kind: "accent", max: 200 },
      { name: "revenue", label: "Revenue streams", kind: "list", itemLabel: "Stream", titleField: "title", max: 6, fields: [
        { name: "title", label: "Title", kind: "text", required: true, max: 60 },
        { name: "body", label: "Text", kind: "textarea", max: 400 },
      ] },
    ],
  },
  { type: "timeline", label: "Timeline", description: "Horizontal milestone timeline with the upcoming milestone featured.", group: "Data-driven", uses: "Timeline & milestones", fields: [kicker, headline(), intro] },
  {
    type: "publications",
    label: "Press spread & archive",
    description: "Photo spread, press archive with hover previews and a community feature.",
    group: "Data-driven",
    uses: "Publications",
    fields: [
      kicker,
      headline(),
      intro,
      { name: "spread", label: "Photo spread (3 images)", kind: "list", itemLabel: "Photo", titleField: "caption", max: 3, fields: [
        { name: "image", label: "Image", kind: "image", required: true },
        { name: "caption", label: "Caption", kind: "text", max: 200 },
        { name: "date", label: "Date label", kind: "text", max: 20 },
      ] },
      { name: "communityKicker", label: "Community: eyebrow", kind: "text", max: 80 },
      { name: "communityTitle", label: "Community: headline", kind: "accent", max: 200 },
      { name: "communityBody", label: "Community: text", kind: "textarea", max: 800 },
      { name: "communityImages", label: "Community: images (main + 2)", kind: "list", itemLabel: "Image", max: 3, fields: [{ name: "image", label: "Image", kind: "image", required: true }] },
    ],
  },
  { type: "awards", label: "Awards & recognition", description: "Editorial ledger of awards.", group: "Data-driven", uses: "Awards & recognition", themeable: true, fields: [kicker, headline(), intro] },
  { type: "principles", label: "Principles", description: "Charcoal section with a photograph and the numbered principles.", group: "Data-driven", uses: "Principles", fields: [kicker, headline(), intro, { name: "image", label: "Photograph", kind: "image" }] },
  { type: "projects_list", label: "Projects", description: "Grid of projects linking to their pages.", group: "Data-driven", uses: "Projects", themeable: true, fields: [kicker, headline(false), intro] },
  {
    type: "explore_index",
    label: "Explore index",
    description: "Editorial contents grid linking to pages.",
    group: "Layout",
    fields: [
      headline(),
      kicker,
      { name: "items", label: "Entries", kind: "list", itemLabel: "Entry", titleField: "title", max: 9, fields: [
        { name: "title", label: "Title", kind: "text", required: true, max: 60 },
        { name: "blurb", label: "Text", kind: "textarea", max: 200 },
        { name: "href", label: "Destination", kind: "url", required: true },
        { name: "image", label: "Image (optional)", kind: "image" },
      ] },
    ],
  },
  // ─── Generic building blocks ─────────────────────────────────────
  {
    type: "text_image",
    label: "Text and image",
    description: "Editorial text beside a photograph.",
    group: "Media",
    themeable: true,
    fields: [
      kicker,
      headline(),
      { name: "body", label: "Text", kind: "richtext" },
      { name: "image", label: "Image", kind: "image" },
      { name: "imageSide", label: "Image position", kind: "select", options: [{ value: "right", label: "Right" }, { value: "left", label: "Left" }] },
      { name: "cta", label: "Button", kind: "link" },
    ],
  },
  {
    type: "full_image",
    label: "Full-width image",
    description: "Edge-to-edge photograph with optional overlaid statement.",
    group: "Media",
    fields: [
      { name: "image", label: "Image", kind: "image", required: true },
      { name: "headline", label: "Overlay statement", kind: "accent", max: 200 },
      { name: "body", label: "Overlay text", kind: "textarea", max: 400 },
      { name: "height", label: "Height", kind: "select", options: [{ value: "tall", label: "Tall" }, { value: "medium", label: "Medium" }, { value: "screen", label: "Full screen" }] },
      { name: "overlay", label: "Overlay intensity", kind: "number", min: 0, max: 100, step: 5 },
    ],
  },
  {
    type: "gallery",
    label: "Image gallery",
    description: "Grid of photographs with captions.",
    group: "Media",
    themeable: true,
    fields: [kicker, headline(false), { name: "images", label: "Images", kind: "list", itemLabel: "Image", titleField: "caption", max: 24, fields: [{ name: "image", label: "Image", kind: "image", required: true }, { name: "caption", label: "Caption", kind: "text", max: 200 }] }],
  },
  {
    type: "video",
    label: "Video",
    description: "Uploaded video or a YouTube link.",
    group: "Media",
    themeable: true,
    fields: [
      kicker,
      headline(false),
      { name: "video", label: "Uploaded video", kind: "video" },
      { name: "youtubeUrl", label: "…or YouTube link", kind: "url", placeholder: "https://www.youtube.com/watch?v=…" },
      { name: "poster", label: "Poster image", kind: "image" },
      { name: "caption", label: "Caption", kind: "text", max: 200 },
    ],
  },
  { type: "quote", label: "Quote", description: "Large pull quote with attribution.", group: "Story", themeable: true, fields: [{ name: "quote", label: "Quote", kind: "textarea", required: true, max: 600 }, { name: "attribution", label: "Attribution", kind: "text", max: 160 }, { name: "href", label: "Source link", kind: "url" }] },
  {
    type: "stats",
    label: "Statistics",
    description: "Row of figures with sources.",
    group: "Story",
    themeable: true,
    fields: [kicker, headline(false), { name: "items", label: "Figures", kind: "list", itemLabel: "Figure", titleField: "value", max: 6, fields: [
      { name: "value", label: "Value", kind: "text", required: true, max: 20 },
      { name: "unit", label: "Unit", kind: "text", max: 30 },
      { name: "label", label: "Description", kind: "textarea", required: true, max: 300 },
      { name: "source", label: "Source", kind: "text", max: 200 },
      { name: "sourceUrl", label: "Source link", kind: "url" },
    ] }],
  },
  {
    type: "feature_list",
    label: "Feature list",
    description: "Numbered list of features or points.",
    group: "Layout",
    themeable: true,
    fields: [kicker, headline(), intro, { name: "items", label: "Items", kind: "list", itemLabel: "Item", titleField: "title", max: 12, fields: [{ name: "title", label: "Title", kind: "text", required: true, max: 80 }, { name: "body", label: "Text", kind: "textarea", max: 400 }] }],
  },
  { type: "rich_text", label: "Rich text", description: "Free-form article text.", group: "Layout", themeable: true, fields: [kicker, headline(false), { name: "body", label: "Text", kind: "richtext" }] },
  {
    type: "split",
    label: "Split screen",
    description: "Two columns of rich text.",
    group: "Layout",
    themeable: true,
    fields: [kicker, headline(false), { name: "left", label: "Left column", kind: "richtext" }, { name: "right", label: "Right column", kind: "richtext" }, { name: "cta", label: "Button", kind: "link" }],
  },
  {
    type: "partners",
    label: "Partners",
    description: "Logos of confirmed partners. Only add organisations with a confirmed partnership.",
    group: "Media",
    themeable: true,
    fields: [kicker, headline(false), intro, { name: "partners", label: "Partners", kind: "list", itemLabel: "Partner", titleField: "name", max: 24, fields: [
      { name: "name", label: "Name", kind: "text", required: true, max: 80 },
      { name: "logo", label: "Logo", kind: "image" },
      { name: "url", label: "Website", kind: "url" },
    ] }],
  },
];

export const sectionTypeMap: Record<string, SectionTypeDef> = Object.fromEntries(sectionTypes.map((s) => [s.type, s]));

export function sectionLabel(type: string) {
  return sectionTypeMap[type]?.label ?? type;
}
