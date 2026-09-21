export interface IncentivePlan {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  effectiveStartDate: string;
  effectiveEndDate: string | null;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateIncentivePlanPayload {
  name: string;
  description?: string;
  isActive?: boolean;
  effectiveStartDate: string;
  effectiveEndDate?: string;
}

export interface UpdateIncentivePlanPayload {
  name?: string;
  description?: string;
  isActive?: boolean;
  effectiveStartDate?: string;
  effectiveEndDate?: string;
}
