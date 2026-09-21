import { apiClient } from "./api-client";
import type { ApiSuccess } from "../types/api";
import type { CommissionRule, CreateCommissionRulePayload, UpdateCommissionRulePayload } from "../types/commission-rule";

export async function listCommissionRules(incentivePlanId: string): Promise<CommissionRule[]> {
  const response = await apiClient.get<ApiSuccess<CommissionRule[]>>("/commission-rules", {
    params: { incentivePlanId },
  });
  return response.data.data;
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
