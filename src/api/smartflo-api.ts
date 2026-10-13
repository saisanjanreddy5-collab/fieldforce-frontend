import { apiClient } from "./api-client";
import type { ApiSuccess } from "../types/api";

export async function callLead(leadId: string, override?: { phone: string; contactName?: string }): Promise<{ refId: string }> {
  const response = await apiClient.post<ApiSuccess<{ refId: string }>>(`/leads/${leadId}/call`, override ?? {});
  return response.data.data;
}
