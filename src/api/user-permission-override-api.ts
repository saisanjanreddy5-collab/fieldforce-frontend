import { apiClient } from "./api-client";
import type { ApiSuccess } from "../types/api";
import type { CreateOverridePayload, UserPermissionOverride } from "../types/user-permission-override";

export async function listOverridesForUser(userId: string): Promise<UserPermissionOverride[]> {
  const response = await apiClient.get<ApiSuccess<UserPermissionOverride[]>>(`/user-permission-overrides/user/${userId}`);
  return response.data.data;
}

export async function createOverride(payload: CreateOverridePayload): Promise<UserPermissionOverride> {
  const response = await apiClient.post<ApiSuccess<UserPermissionOverride>>("/user-permission-overrides", payload);
  return response.data.data;
}

export async function clearOverride(id: string): Promise<void> {
  await apiClient.patch(`/user-permission-overrides/${id}/clear`);
}

export async function clearAllOverridesForUser(userId: string): Promise<number> {
  const response = await apiClient.post<ApiSuccess<{ cleared: number }>>(`/user-permission-overrides/user/${userId}/clear-all`);
  return response.data.data.cleared;
}
