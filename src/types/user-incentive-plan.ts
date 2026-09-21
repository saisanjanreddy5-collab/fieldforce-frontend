export interface UserIncentivePlan {
  id: string;
  userId: string;
  incentivePlanId: string;
  effectiveStartDate: string;
  effectiveEndDate: string | null;
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
}
