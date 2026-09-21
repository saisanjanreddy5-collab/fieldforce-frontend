import { apiClient } from "./api-client";
import type { ApiSuccess } from "../types/api";
import type { CreateOfficePayload, Office, UpdateOfficePayload } from "../types/office";

export async function listOffices(): Promise<Office[]> {
  const response = await apiClient.get<ApiSuccess<Office[]>>("/offices");
  return response.data.data;
}

export async function createOffice(payload: CreateOfficePayload): Promise<Office> {
  const response = await apiClient.post<ApiSuccess<Office>>("/offices", payload);
  return response.data.data;
}

export async function updateOffice(id: string, payload: UpdateOfficePayload): Promise<Office> {
  const response = await apiClient.patch<ApiSuccess<Office>>(`/offices/${id}`, payload);
  return response.data.data;
}
