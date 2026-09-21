import { apiClient } from "./api-client";
import type { ApiSuccess } from "../types/api";
import type { CreateTargetPayload, Target, UpdateTargetPayload } from "../types/target";

export async function listTargets(userId?: string): Promise<Target[]> {
  const response = await apiClient.get<ApiSuccess<Target[]>>("/targets", {
    params: userId ? { userId } : undefined,
  });
  return response.data.data;
}

export async function createTarget(payload: CreateTargetPayload): Promise<Target> {
  const response = await apiClient.post<ApiSuccess<Target>>("/targets", payload);
  return response.data.data;
}

export async function updateTarget(id: string, payload: UpdateTargetPayload): Promise<Target> {
  const response = await apiClient.patch<ApiSuccess<Target>>(`/targets/${id}`, payload);
  return response.data.data;
}

export async function deleteTarget(id: string): Promise<void> {
  await apiClient.delete(`/targets/${id}`);
}
