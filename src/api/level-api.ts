import { apiClient } from "./api-client";
import type { ApiSuccess } from "../types/api";
import type { CreateLevelPayload, Level } from "../types/level";

export async function listLevels(): Promise<Level[]> {
  const response = await apiClient.get<ApiSuccess<Level[]>>("/levels");
  return response.data.data;
}

export async function createLevel(payload: CreateLevelPayload): Promise<Level> {
  const response = await apiClient.post<ApiSuccess<Level>>("/levels", payload);
  return response.data.data;
}
