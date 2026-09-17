export interface StageDef {
  key: string;
  label: string;
  subtitle: string;
}

// Matches the exact stage values already used in the backend and the
// Dashboard's pipeline chart (STAGE_ORDER) - keep these two in sync.
export const STAGES: StageDef[] = [
  { key: "new", label: "New", subtitle: "Just created" },
  { key: "qualified", label: "Qualified", subtitle: "Eligibility confirmed" },
  { key: "site_visit", label: "Site Visit", subtitle: "Location inspection" },
  { key: "proposal", label: "Proposal", subtitle: "Commercials sent" },
  { key: "negotiation", label: "Negotiation", subtitle: "Terms discussion" },
  { key: "agreement", label: "Agreement", subtitle: "Legal & signing" },
  { key: "won", label: "Won", subtitle: "Handed to onboarding" },
  { key: "lost", label: "Lost", subtitle: "Reason captured" },
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
};
