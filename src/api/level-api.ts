import { apiClient } from "./api-client";
import type { ApiSuccess } from "../types/api";
import type { CreateLevelPayload, Level, UpdateLevelPayload } from "../types/level";

export async function listLevels(): Promise<Level[]> {
  const response = await apiClient.get<ApiSuccess<{ levels: Level[]; total: number }>>("/levels", { params: { limit: 200 } });
  return response.data.data.levels;
}

export async function createLevel(payload: CreateLevelPayload): Promise<Level> {
  const response = await apiClient.post<ApiSuccess<Level>>("/levels", payload);
  return response.data.data;
}

export async function updateLevel(id: string, payload: UpdateLevelPayload): Promise<Level> {
  const response = await apiClient.patch<ApiSuccess<Level>>(`/levels/${id}`, payload);
  return response.data.data;
}
