import { apiClient } from "./api-client";
import type { ApiSuccess } from "../types/api";
import type { CommissionRule, CreateCommissionRulePayload, UpdateCommissionRulePayload } from "../types/commission-rule";

export async function listCommissionRules(incentivePlanId: string, archived?: boolean): Promise<CommissionRule[]> {
  const response = await apiClient.get<ApiSuccess<{ commissionRules: CommissionRule[]; total: number }>>("/commission-rules", {
    params: { incentivePlanId, limit: 200, archived },
  });
  return response.data.data.commissionRules;
}

export async function createCommissionRule(payload: CreateCommissionRulePayload): Promise<CommissionRule> {
  const response = await apiClient.post<ApiSuccess<CommissionRule>>("/commission-rules", payload);
  return response.data.data;
}

export async function updateCommissionRule(id: string, payload: UpdateCommissionRulePayload): Promise<CommissionRule> {
  const response = await apiClient.patch<ApiSuccess<CommissionRule>>(`/commission-rules/${id}`, payload);
  return response.data.data;
}

export async function deleteCommissionRule(id: string): Promise<void> {
  await apiClient.delete(`/commission-rules/${id}`);
}

export async function restoreCommissionRule(id: string): Promise<void> {
  await apiClient.patch(`/commission-rules/${id}/restore`);
}
