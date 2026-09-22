export interface UserIncentivePlan {
  id: string;
  userId: string;
  incentivePlanId: string;
  effectiveStartDate: string;
  effectiveEndDate: string | null;
  rate: string | null;
  capPerCycle: number | null;
  paysFromAttainmentPercent: number | null;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserIncentivePlanPayload {
  userId: string;
  incentivePlanId: string;
  effectiveStartDate: string;
  effectiveEndDate?: string;
  rate?: string;
  capPerCycle?: number;
  paysFromAttainmentPercent?: number;
}
