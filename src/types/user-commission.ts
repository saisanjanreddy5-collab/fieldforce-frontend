export type CommissionBasis = "collected_revenue" | "invoiced_revenue" | "gross_margin" | "units_sold";
export type PayoutCycle = "monthly" | "quarterly" | "half_yearly" | "annual";

export interface UserCommission {
  id: string;
  userId: string;
  basis: CommissionBasis;
  rate: string | null;
  appliesTo: string | null;
  payoutCycle: PayoutCycle;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserCommissionPayload {
  userId: string;
  basis: CommissionBasis;
  rate?: string;
  appliesTo?: string;
  payoutCycle: PayoutCycle;
}
