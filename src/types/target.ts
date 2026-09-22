export type PeriodType = "monthly" | "quarterly" | "annual";

export interface Target {
  id: string;
  userId: string;
  periodType: PeriodType;
  periodStart: string;
  periodEnd: string;
  targetAmount: number;
  unitTarget: string | null;
  achievedAmount: number;
  remainingAmount: number;
  achievementPercent: number;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTargetPayload {
  userId: string;
  periodType: PeriodType;
  periodAnchor: string;
  targetAmount: number;
  unitTarget?: string;
}

export interface UpdateTargetPayload {
  periodType?: PeriodType;
  periodAnchor?: string;
  targetAmount?: number;
  unitTarget?: string | null;
}
