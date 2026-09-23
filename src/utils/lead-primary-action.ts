export type PrimaryActionKind = "onboard" | "addActivity" | "call" | "editLead" | "none";

export interface LeadActionAvailability {
  /** Mirrors LeadDetail's existing Onboard condition exactly: category === "FOFO" AND the caller already resolved fofo_onboarding.view. */
  canOnboard: boolean;
  /** Mirrors OpportunitiesTab's existing "open" definition exactly: stage !== "won" && stage !== "lost". */
  hasOpenOpportunity: boolean;
  /** hasPermission("activities.create"), resolved by the caller. */
  canAddActivity: boolean;
  /** Boolean(lead.phone) - no permission gate exists on Call today. */
  canCall: boolean;
  /** hasPermission("leads.update"), resolved by the caller. */
  canEditLead: boolean;
}

// Pure, deterministic, no API/DB/permission-string access - every branch
// maps to a condition that already exists elsewhere in this app (Onboard's
// exact disabled-condition in LeadDetail, an opportunity's exact "open"
// definition in OpportunitiesTab, Call's existing phone-presence check).
// Permission resolution happens at the call site; this function only
// receives already-resolved booleans, so it never duplicates authorization
// logic.
export function getLeadPrimaryAction(availability: LeadActionAvailability): PrimaryActionKind {
  if (availability.canOnboard) return "onboard";
  if (availability.hasOpenOpportunity && availability.canAddActivity) return "addActivity";
  if (availability.canCall) return "call";
  if (availability.canEditLead) return "editLead";
  return "none";
}

export const PRIMARY_ACTION_LABEL: Record<PrimaryActionKind, string> = {
  onboard: "Onboard",
  addActivity: "Add activity",
  call: "Call",
  editLead: "Edit lead",
  none: "",
};

// Human-readable framing of the exact same condition getLeadPrimaryAction
// already branched on - not a new signal, just explaining the one that fired.
export const PRIMARY_ACTION_REASON: Record<PrimaryActionKind, string> = {
  onboard: "This FOFO lead is ready to start onboarding",
  addActivity: "There's an open opportunity - keep it moving with a follow-up",
  call: "No activity logged yet - a call is the fastest way to qualify this lead",
  editLead: "Add missing details to unlock the next step",
  none: "",
};
