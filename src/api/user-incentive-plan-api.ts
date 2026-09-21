import { apiClient } from "./api-client";
import type { ApiSuccess } from "../types/api";
import type { CreateUserIncentivePlanPayload, UserIncentivePlan } from "../types/user-incentive-plan";

export async function listUserIncentivePlans(userId?: string): Promise<UserIncentivePlan[]> {
  const response = await apiClient.get<ApiSuccess<UserIncentivePlan[]>>("/user-incentive-plans", {
    params: userId ? { userId } : undefined,
  });
  return response.data.data;
}

export async function createUserIncentivePlan(payload: CreateUserIncentivePlanPayload): Promise<UserIncentivePlan> {
  const response = await apiClient.post<ApiSuccess<UserIncentivePlan>>("/user-incentive-plans", payload);
  return response.data.data;
}

export async function deleteUserIncentivePlan(id: string): Promise<void> {
  await apiClient.delete<ApiSuccess<null>>(`/user-incentive-plans/${id}`);
}
