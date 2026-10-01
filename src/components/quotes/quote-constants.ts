import { appTokens } from "../../utils/design-system";
import type { QuoteStatus } from "../../types/quote";

export const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
  draft: "Draft",
  sent: "Sent",
  accepted: "Accepted",
  rejected: "Rejected",
};

export const QUOTE_STATUS_COLORS: Record<QuoteStatus, string> = {
  draft: appTokens.textTertiary,
  sent: appTokens.primary,
  accepted: appTokens.success,
  rejected: appTokens.danger,
};

export const QUOTE_STATUS_OPTIONS = (Object.keys(QUOTE_STATUS_LABELS) as QuoteStatus[]).map((value) => ({
  value,
  label: QUOTE_STATUS_LABELS[value],
}));
