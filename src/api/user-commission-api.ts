import { apiClient } from "./api-client";
import type { ApiSuccess } from "../types/api";
import type { CreateUserCommissionPayload, UserCommission } from "../types/user-commission";

export async function listUserCommissions(userId?: string): Promise<UserCommission[]> {
  const response = await apiClient.get<ApiSuccess<UserCommission[]>>("/user-commissions", { params: userId ? { userId } : undefined });
  return response.data.data;
}

export async function createUserCommission(payload: CreateUserCommissionPayload): Promise<UserCommission> {
  const response = await apiClient.post<ApiSuccess<UserCommission>>("/user-commissions", payload);
  return response.data.data;
}

export async function deleteUserCommission(id: string): Promise<void> {
  await apiClient.delete<ApiSuccess<null>>(`/user-commissions/${id}`);
}
