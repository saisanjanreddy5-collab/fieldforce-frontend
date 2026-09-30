import { apiClient } from "./api-client";
import type { ApiSuccess } from "../types/api";
import type { UpdateWebsiteLeadSourcePayload, UpsertWebsiteLeadSourcePayload, WebsiteLeadSource } from "../types/website-lead-source";

export async function listWebsiteLeadSources(): Promise<WebsiteLeadSource[]> {
  const response = await apiClient.get<ApiSuccess<WebsiteLeadSource[]>>("/website-lead-sources");
  return response.data.data;
}

export async function createWebsiteLeadSource(payload: UpsertWebsiteLeadSourcePayload): Promise<WebsiteLeadSource> {
  const response = await apiClient.post<ApiSuccess<WebsiteLeadSource>>("/website-lead-sources", payload);
  return response.data.data;
}

export async function updateWebsiteLeadSource(id: string, payload: UpdateWebsiteLeadSourcePayload): Promise<WebsiteLeadSource> {
  const response = await apiClient.patch<ApiSuccess<WebsiteLeadSource>>(`/website-lead-sources/${id}`, payload);
  return response.data.data;
}
