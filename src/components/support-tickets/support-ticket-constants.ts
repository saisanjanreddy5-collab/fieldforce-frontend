// Real values confirmed against the Frappe site's own HD Ticket Priority /
// HD Ticket Status records - both are configurable Link doctypes on
// Frappe's side, not a fixed enum baked into FieldForce, so this list is
// only as current as what's configured there today.
export const TICKET_PRIORITIES = ["Urgent", "High", "Medium", "Low"] as const;
export const TICKET_STATUSES = ["Open", "Replied", "Resolved", "Closed"] as const;

export const STATUS_COLORS: Record<string, string> = {
  Open: "blue",
  Replied: "gold",
  Resolved: "green",
  Closed: "default",
};

export const PRIORITY_COLORS: Record<string, string> = {
  Urgent: "magenta",
  High: "red",
  Medium: "orange",
  Low: "default",
};

const TERMINAL_STATUSES = ["Resolved", "Closed"];

// "Due in 2h 15m" / "Overdue by 20m" - relative to right now, not a fixed
// label, since a deadline's urgency only makes sense against the current
// moment.
export function formatRelativeDeadline(iso: string): string {
  const diffMs = new Date(iso).getTime() - Date.now();
  const abs = Math.abs(diffMs);
  const mins = Math.round(abs / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  const text = days > 0 ? `${days}d ${hours % 24}h` : hours > 0 ? `${hours}h ${mins % 60}m` : `${mins}m`;
  return diffMs < 0 ? `Overdue by ${text}` : `Due in ${text}`;
}

export interface SlaTag {
  label: string;
  color: string;
}

// Resolution only, not first-response - the more consequential of the two
// promises for an at-a-glance column (the detail drawer shows both). Null
// for any ticket already Resolved/Closed (this is a live countdown for
// still-open work, not a retroactive "was it met" compliance flag - a
// ticket resolved late still reads as resolved, not overdue, once closed
// out) or for one with no response_by/resolution_by at all (raised before
// this feature existed, or before the SLA policy's own date range was
// fixed).
export function resolutionSlaTag(ticket: { status: string; resolutionBy: string | null; resolutionBreached: boolean }): SlaTag | null {
  if (TERMINAL_STATUSES.includes(ticket.status) || !ticket.resolutionBy) return null;
  if (ticket.resolutionBreached) return { label: "Resolution overdue", color: "red" };
  return { label: formatRelativeDeadline(ticket.resolutionBy), color: "default" };
}
