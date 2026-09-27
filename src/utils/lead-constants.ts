// The real, established set of values - shared between LeadFormDrawer (data
// entry) and the Leads workspace filters (server-side filtering), so there
// is exactly one place these lists are defined.
export const LEAD_STATUS_VALUES = [
  "New",
  "Open",
  "Qualified",
  "Site visit",
  "Proposal",
  "Negotiation",
  "Agreement",
  "Converted",
  "Closed Lost",
];

export const LEAD_CATEGORY_VALUES = ["FOFO", "Stockist", "B2B", "COCO", "Lifestyle", "Institutes", "PCD", "Ethical"];

// A warm-to-cool progression toward the two terminal stages, same pattern as
// Opportunities' STAGES colors - so a stage tag reads at a glance instead of
// every stage rendering in the same flat neutral tone.
export const LEAD_STATUS_COLORS: Record<string, string> = {
  New: "#64748b",
  Open: "#0284c7",
  Qualified: "#0891b2",
  "Site visit": "#6d4ecf",
  Proposal: "#dc8a00",
  Negotiation: "#e07a1f",
  Agreement: "#0e9f6e",
  Converted: "#12a150",
  "Closed Lost": "#e0393e",
};
