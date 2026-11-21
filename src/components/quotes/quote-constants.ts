import type { QuoteStatus } from "../../types/quote";

export const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
  draft: "Draft",
  sent: "Sent",
  accepted: "Accepted",
  rejected: "Rejected",
};

// antd tag colours - the same soft status tags as the other list pages.
export const QUOTE_STATUS_COLORS: Record<QuoteStatus, string> = {
  draft: "default",
  sent: "blue",
  accepted: "green",
  rejected: "red",
};

export const QUOTE_STATUS_OPTIONS = (Object.keys(QUOTE_STATUS_LABELS) as QuoteStatus[]).map((value) => ({
  value,
  label: QUOTE_STATUS_LABELS[value],
}));
