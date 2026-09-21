export interface CommissionRule {
  id: string;
  incentivePlanId: string;
  name: string;
  description: string | null;
  ruleType: string | null;
  config: Record<string, unknown>;
  isActive: boolean;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCommissionRulePayload {
  incentivePlanId: string;
  name: string;
  description?: string;
  ruleType?: string;
  config?: Record<string, unknown>;
  isActive?: boolean;
}

export interface UpdateCommissionRulePayload {
  name?: string;
  description?: string;
  ruleType?: string;
  config?: Record<string, unknown>;
  isActive?: boolean;
}
