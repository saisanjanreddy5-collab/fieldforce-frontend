import { apiClient } from "./api-client";
import type { ApiSuccess } from "../types/api";
import type { CreateOpportunityPayload, ListOpportunitiesFilters, Opportunity } from "../types/opportunity";

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
// (instant client-side filtering, no per-filter round trip) - capping at a
// single page of 200 would silently drop anything beyond that for a busy
// pipeline. This walks every page in the background instead, 200 rows at a
// time, handing back progress after each page so the UI can show something
// better than a blank spinner while a large pipeline streams in.
export async function listAllOpportunities(onProgress?: (loadedSoFar: Opportunity[], total: number) => void): Promise<Opportunity[]> {
  const PAGE_SIZE = 200;
  const first = await listOpportunities({ page: 1, limit: PAGE_SIZE });
  let all = first.opportunities;
  onProgress?.(all, first.total);

  let page = 2;
  while (all.length < first.total) {
    const next = await listOpportunities({ page, limit: PAGE_SIZE });
    if (next.opportunities.length === 0) break;
    // A new array each time, not a mutate-in-place push - React's useState
    // setter bails out of re-rendering when the value passed is
    // reference-equal to what's already in state, which an in-place push
    // would be (same array object, just with more items shoved into it).
    all = [...all, ...next.opportunities];
    onProgress?.(all, first.total);
    page += 1;
  }
  return all;
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
