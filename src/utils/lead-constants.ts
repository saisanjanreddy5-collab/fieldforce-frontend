// A warm-to-cool progression toward the two terminal stages, same pattern as
// Opportunities' STAGES colors - so a stage tag reads at a glance instead of
// every stage rendering in the same flat neutral tone.
export const LEAD_STATUS_COLORS: Record<string, string> = {
  New: "#64748b",
  FLC: "#94a3b8",
  SLC: "#eab308",
  Open: "#0284c7",
  Qualified: "#0891b2",
  "Site visit": "#6d4ecf",
  Proposal: "#dc8a00",
  Negotiation: "#e07a1f",
  Agreement: "#0e9f6e",
  Converted: "#12a150",
  "Closed Lost": "#e0393e",
};

// The two calling-tier stages a marketing lead walks through before
// reaching Qualified, mirroring the same constants the backend exports from
// lead-service.ts.
export const FLC_STAGE = "FLC";
export const SLC_STAGE = "SLC";
