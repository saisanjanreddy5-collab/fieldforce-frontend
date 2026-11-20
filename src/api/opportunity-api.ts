import { apiClient } from "./api-client";
import { fetchAllPages } from "./fetch-all-pages";
import type { ApiSuccess } from "../types/api";
import type { CreateOpportunityPayload, ListOpportunitiesFilters, Opportunity } from "../types/opportunity";
import type { AuditEvent } from "../types/audit-consent";

export async function listOpportunitiesForLead(leadId: string): Promise<Opportunity[]> {
  const response = await apiClient.get<ApiSuccess<Opportunity[]>>(`/leads/${leadId}/opportunities`);
  return response.data.data;
}

export interface ListOpportunitiesResult {
  opportunities: Opportunity[];
  total: number;
}

export async function listOpportunities(
  filters: ListOpportunitiesFilters & { page?: number; limit?: number } = {}
): Promise<ListOpportunitiesResult> {
  const response = await apiClient.get<ApiSuccess<ListOpportunitiesResult>>("/opportunities", { params: { limit: 200, ...filters } });
  return response.data.data;
}

// The board/list/forecast views all work off one complete in-memory array
// (instant client-side filtering, no per-filter round trip) - one page of
// 200 would silently drop anything beyond that for a busy pipeline.
export function listAllOpportunities(onProgress?: (loadedSoFar: Opportunity[], total: number) => void): Promise<Opportunity[]> {
  return fetchAllPages(
    (page, limit) => listOpportunities({ page, limit }).then((r) => ({ items: r.opportunities, total: r.total })),
    200,
    onProgress
  );
}

export async function getOpportunityById(id: string): Promise<Opportunity> {
  const response = await apiClient.get<ApiSuccess<Opportunity>>(`/opportunities/${id}`);
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

// Every real stage move on this opportunity, newest first - powers the
// detail drawer's "History" section.
export async function getOpportunityHistory(id: string): Promise<AuditEvent[]> {
  const response = await apiClient.get<ApiSuccess<AuditEvent[]>>(`/opportunities/${id}/history`);
  return response.data.data;
}

export async function archiveOpportunity(id: string): Promise<void> {
  await apiClient.delete(`/opportunities/${id}`);
}

export async function restoreOpportunity(id: string): Promise<void> {
  await apiClient.patch(`/opportunities/${id}/restore`);
}
