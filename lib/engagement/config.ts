/**
 * Engagement system: shared constants for the public forms, the API, the
 * admin inbox and the notification emails. Pure data, safe on both sides.
 */

export const partnershipCategories = [
  "Technology & Engineering",
  "Energy Infrastructure",
  "Strategic Partnerships",
  "Funding & Investment",
  "Research & Academia",
  "Community Development",
  "Implementation Partners",
  "Corporate Partnerships",
  "Other",
] as const;

export const supportTypes = ["Financial contribution", "Equipment donation", "Technical expertise", "Professional services", "Institutional support", "Other"] as const;

export const supportForms = [
  { value: "financial", label: "Financial" },
  { value: "equipment", label: "Equipment" },
  { value: "services", label: "Services or expertise" },
  { value: "other", label: "Another form" },
] as const;
export type SupportForm = (typeof supportForms)[number]["value"];

/** The form of support most people mean by each type (pre-selected, still editable). */
export const supportFormForType: Record<(typeof supportTypes)[number], SupportForm> = {
  "Financial contribution": "financial",
  "Equipment donation": "equipment",
  "Technical expertise": "services",
  "Professional services": "services",
  "Institutional support": "other",
  Other: "other",
};

export const supportAreas = [
  "Community energy pilot development",
  "Solar panels and energy equipment",
  "Battery storage",
  "Engineering and research",
  "Technology development",
  "Rural community energy initiatives",
  "Productive-use energy solutions",
  "Wherever it is needed most",
] as const;

export const currencies = ["USD", "EUR", "GBP", "ZAR", "KES", "RWF", "ZWG", "NGN", "GHS", "BWP", "CHF", "CAD", "AUD", "AED", "CNY", "JPY"] as const;

/** Quick-pick amounts shown on the support form (any custom amount is allowed). */
export const suggestedAmounts = [100, 500, 1000, 5000] as const;

export const contactCategories = ["General Inquiry", "Media & Press", "Speaking Invitations", "Volunteering", "Careers & Opportunities", "Project Inquiry", "Other"] as const;

export const engagementStatuses = ["new", "reviewed", "in_discussion", "accepted", "declined", "completed"] as const;
export type EngagementStatus = (typeof engagementStatuses)[number];

export const statusLabels: Record<EngagementStatus, string> = {
  new: "New",
  reviewed: "Reviewed",
  in_discussion: "In discussion",
  accepted: "Accepted",
  declined: "Declined",
  completed: "Completed",
};

export const engagementKinds = ["partnerships", "support", "contact"] as const;
export type EngagementKind = (typeof engagementKinds)[number];

export const isEngagementKind = (k: unknown): k is EngagementKind => typeof k === "string" && (engagementKinds as readonly string[]).includes(k);

type KindDef = {
  table: string;
  /** Tab label in the inbox. */
  label: string;
  /** Singular noun for emails and the dashboard. */
  noun: string;
  nameCol: string;
  categoryCol: string;
  orgCol: string | null;
  /** Columns searched by the inbox search box. */
  searchCols: string[];
  /** Columns loaded for the list view. */
  listCols: string;
  /** Short line shown under the name in the list. */
  previewCol: string;
  notifyFlag: "notify_partnership" | "notify_support" | "notify_contact";
};

export const kinds: Record<EngagementKind, KindDef> = {
  partnerships: {
    table: "partnership_inquiries",
    label: "Partnership Requests",
    noun: "Partnership request",
    nameCol: "full_name",
    categoryCol: "category",
    orgCol: "organisation",
    searchCols: ["full_name", "organisation", "email", "country", "proposal", "message"],
    listCols: "id, full_name, organisation, email, category, proposal, status, created_at",
    previewCol: "proposal",
    notifyFlag: "notify_partnership",
  },
  support: {
    table: "support_inquiries",
    label: "Support & Donations",
    noun: "Support inquiry",
    nameCol: "full_name",
    categoryCol: "support_type",
    orgCol: null,
    searchCols: ["full_name", "email", "country", "support_area", "message"],
    listCols: "id, full_name, email, support_type, support_area, amount, currency, status, created_at",
    previewCol: "support_area",
    notifyFlag: "notify_support",
  },
  contact: {
    table: "contact_messages",
    label: "Contact Messages",
    noun: "Contact message",
    nameCol: "name",
    categoryCol: "inquiry",
    orgCol: "organisation",
    searchCols: ["name", "organisation", "email", "subject", "message"],
    listCols: "id, name, organisation, email, inquiry, subject, message, status, created_at",
    previewCol: "subject",
    notifyFlag: "notify_contact",
  },
};

export function adminInboxPath(kind: EngagementKind, id?: string) {
  return `/admin/engagement?tab=${kind}${id ? `&id=${id}` : ""}`;
}

export function formatAmount(amount: unknown, currency: unknown): string | null {
  const n = typeof amount === "number" ? amount : Number(amount);
  if (amount === null || amount === undefined || amount === "" || !Number.isFinite(n)) return null;
  const formatted = n.toLocaleString("en-GB", { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 });
  return typeof currency === "string" && currency ? `${currency} ${formatted}` : formatted;
}
