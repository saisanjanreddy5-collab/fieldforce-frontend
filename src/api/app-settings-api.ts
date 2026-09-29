import { apiClient } from "./api-client";
import type { ApiSuccess } from "../types/api";

export interface AppSetting {
  key: string;
  value: string;
  updatedAt: string;
}

export async function getSetting(key: string): Promise<AppSetting> {
  const response = await apiClient.get<ApiSuccess<AppSetting>>(`/app-settings/${key}`);
  return response.data.data;
}

export async function setSetting(key: string, value: string | number): Promise<AppSetting> {
  const response = await apiClient.patch<ApiSuccess<AppSetting>>(`/app-settings/${key}`, { value });
  return response.data.data;
}
