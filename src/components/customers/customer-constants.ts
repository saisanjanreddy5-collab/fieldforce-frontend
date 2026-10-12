import { appTokens } from "../../utils/design-system";
import type { Customer } from "../../types/customer";

export const CUSTOMER_STATUSES = ["active", "inactive", "on_hold"] as const;

export const CUSTOMER_STATUS_LABELS: Record<string, string> = {
  active: "Active",
  inactive: "Inactive",
  on_hold: "On hold",
};

export const CUSTOMER_STATUS_COLORS: Record<string, string> = {
  active: appTokens.success,
  inactive: appTokens.textTertiary,
  on_hold: appTokens.warning,
};

// A=best - D=worst, same real lettered scale the backend enforces
// (customers.credit_category CHECK constraint).
export const CREDIT_CATEGORY_COLORS: Record<string, string> = {
  A: appTokens.success,
  B: appTokens.primary,
  C: appTokens.warning,
  D: appTokens.danger,
};

// Deterministic color per category string (FOFO/B2B/Stockist/... whatever a
// given org actually has configured under Settings > Lead categories) -
// there's no fixed palette to key off since the real values are
// org-configurable, not a closed enum.
const CATEGORY_PALETTE = ["#1354e0", "#6d4ecf", "#0e9f6e", "#dc8a00", "#be185d", "#0284c7"];

export function categoryColor(category: string): string {
  let hash = 0;
  for (let i = 0; i < category.length; i++) hash = category.charCodeAt(i) + ((hash << 5) - hash);
  return CATEGORY_PALETTE[Math.abs(hash) % CATEGORY_PALETTE.length];
}

export interface CustomerRisk {
  label: string;
  color: string;
}

// An honest, deterministic read of real fields (status + credit vs
// balance) - not a scoring model, never fabricated. Mirrors the reference
// mockup's "Risk" column, but every value here is arithmetic on data the
// backend actually has.
export function customerRisk(c: Pick<Customer, "status" | "creditLimit" | "outstandingBalance">): CustomerRisk {
  if (c.status === "on_hold") return { label: "On hold", color: appTokens.warning };
  if (c.creditLimit <= 0) return { label: "—", color: appTokens.textTertiary };
  if (c.outstandingBalance > c.creditLimit) return { label: "Over limit", color: appTokens.danger };
  const ratio = c.outstandingBalance / c.creditLimit;
  if (ratio >= 0.8) return { label: "Watch", color: appTokens.warning };
  return { label: "Low", color: appTokens.success };
}
