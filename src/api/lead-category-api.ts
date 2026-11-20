import { apiClient } from "./api-client";
import type { ApiSuccess } from "../types/api";
import { createCachedResource } from "../utils/cached-resource";
import type { CreateLeadCategoryPayload, LeadCategory, UpdateLeadCategoryPayload } from "../types/lead-category";

export async function listLeadCategories(): Promise<LeadCategory[]> {
  const response = await apiClient.get<ApiSuccess<{ leadCategories: LeadCategory[]; total: number }>>("/lead-categories", {
    params: { limit: 200 },
  });
  return response.data.data.leadCategories;
}

/** Shared, cached copy for the screens that pick a category (see useLeadCategories). */
export const leadCategoriesResource = createCachedResource(listLeadCategories);

export async function createLeadCategory(payload: CreateLeadCategoryPayload): Promise<LeadCategory> {
  const response = await apiClient.post<ApiSuccess<LeadCategory>>("/lead-categories", payload);
  leadCategoriesResource.invalidate();
  return response.data.data;
}

export async function updateLeadCategory(key: string, payload: UpdateLeadCategoryPayload): Promise<LeadCategory> {
  const response = await apiClient.patch<ApiSuccess<LeadCategory>>(`/lead-categories/${key}`, payload);
  leadCategoriesResource.invalidate();
  return response.data.data;
}

export async function reorderLeadCategories(orderedKeys: string[]): Promise<LeadCategory[]> {
  const response = await apiClient.patch<ApiSuccess<LeadCategory[]>>("/lead-categories/reorder", { orderedKeys });
  leadCategoriesResource.invalidate();
  return response.data.data;
}
