export interface StageDef {
  key: string;
  label: string;
  subtitle: string;
  /** Accent color for this stage's Kanban column header, card left-edge
   * stripe, and progress bar - a warm-to-cool progression so the pipeline's
   * health reads at a glance instead of every stage looking identical. */
  color: string;
}

// Matches the exact stage values already used in the backend and the
// Dashboard's pipeline chart (STAGE_ORDER) - keep these two in sync.
export const STAGES: StageDef[] = [
  // Was #9aa2b1 - the same low-contrast gray the app-wide text-token fix
  // (design-system.ts textTertiary) corrected everywhere else, just missed
  // here since this is its own independent accent value, not a read of that
  // token. OpportunityListView renders this as literal Tag text color, where
  // the old value read close to unreadable against its own tint background.
  { key: "new", label: "New", subtitle: "Just created", color: "#64748b" },
  { key: "qualified", label: "Qualified", subtitle: "Eligibility confirmed", color: "#0284c7" },
  { key: "site_visit", label: "Site Visit", subtitle: "Location inspection", color: "#6d4ecf" },
  { key: "proposal", label: "Proposal", subtitle: "Commercials sent", color: "#dc8a00" },
  { key: "negotiation", label: "Negotiation", subtitle: "Terms discussion", color: "#e07a1f" },
  { key: "agreement", label: "Agreement", subtitle: "Legal & signing", color: "#0e9f6e" },
  { key: "won", label: "Won", subtitle: "Handed to onboarding", color: "#12a150" },
  { key: "lost", label: "Lost", subtitle: "Reason captured", color: "#e0393e" },
];

export const STAGE_OPTIONS = STAGES.map((s) => ({ value: s.key, label: s.label }));

// Used only to make the "weighted forecast" stat meaningful before a user
// manually sets a probability on an opportunity - never stored, just a
// fallback for the calculation and the card's progress bar.
export const STAGE_DEFAULT_PROBABILITY: Record<string, number> = {
  new: 10,
  qualified: 25,
  site_visit: 40,
  proposal: 60,
  negotiation: 75,
  agreement: 90,
  won: 100,
  lost: 0,
};

export const CATEGORY_COLORS: Record<string, string> = {
  FOFO: "blue",
  Stockist: "purple",
  B2B: "geekblue",
  COCO: "green",
  Lifestyle: "gold",
  Institutes: "cyan",
  PCD: "volcano",
  Ethical: "magenta",
};
