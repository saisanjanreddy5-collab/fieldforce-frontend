import { apiClient } from "./api-client";
import type { ApiSuccess } from "../types/api";
import type { CreateOpportunityPayload, Opportunity } from "../types/opportunity";

export async function listOpportunitiesForLead(leadId: string): Promise<Opportunity[]> {
  const response = await apiClient.get<ApiSuccess<Opportunity[]>>(`/leads/${leadId}/opportunities`);
  return response.data.data;
}

export async function convertLead(leadId: string, payload: CreateOpportunityPayload): Promise<Opportunity> {
  const response = await apiClient.post<ApiSuccess<Opportunity>>(`/leads/${leadId}/convert`, payload);
  return response.data.data;
}

export async function updateOpportunity(id: string, payload: Partial<CreateOpportunityPayload>): Promise<Opportunity> {
  const response = await apiClient.patch<ApiSuccess<Opportunity>>(`/opportunities/${id}`, payload);
  return response.data.data;
}
