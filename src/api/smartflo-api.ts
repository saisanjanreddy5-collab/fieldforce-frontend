import { apiClient } from "./api-client";
import type { ApiSuccess } from "../types/api";

export async function callLead(leadId: string): Promise<{ refId: string }> {
  const response = await apiClient.post<ApiSuccess<{ refId: string }>>(`/leads/${leadId}/call`);
  return response.data.data;
}
