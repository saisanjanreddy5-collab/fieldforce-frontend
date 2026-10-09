// Frappe Helpdesk's default HD Ticket Status values - but that list is
// itself a configurable doctype on the Frappe side (confirmed against
// hd_ticket.json), not a fixed enum, so STATUS_COLORS is only a best-effort
// mapping for the common defaults - any status not listed here still
// displays correctly via the "default" Tag color fallback at the call site.
export const STATUS_COLORS: Record<string, string> = {
  Open: "blue",
  Replied: "gold",
  Resolved: "green",
  Closed: "default",
};
