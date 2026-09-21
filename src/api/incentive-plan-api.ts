import { apiClient } from "./api-client";
import type { ApiSuccess } from "../types/api";
import type { CreateIncentivePlanPayload, IncentivePlan, UpdateIncentivePlanPayload } from "../types/incentive-plan";

export async function listIncentivePlans(): Promise<IncentivePlan[]> {
  const response = await apiClient.get<ApiSuccess<IncentivePlan[]>>("/incentive-plans");
  return response.data.data;
}

export async function createIncentivePlan(payload: CreateIncentivePlanPayload): Promise<IncentivePlan> {
  const response = await apiClient.post<ApiSuccess<IncentivePlan>>("/incentive-plans", payload);
  return response.data.data;
}

export async function updateIncentivePlan(id: string, payload: UpdateIncentivePlanPayload): Promise<IncentivePlan> {
  const response = await apiClient.patch<ApiSuccess<IncentivePlan>>(`/incentive-plans/${id}`, payload);
  return response.data.data;
}

export async function deleteIncentivePlan(id: string): Promise<void> {
  await apiClient.delete(`/incentive-plans/${id}`);
}
