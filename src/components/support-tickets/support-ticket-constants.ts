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
