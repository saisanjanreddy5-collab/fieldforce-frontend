import { leadCategoriesResource } from "../api/lead-category-api";
import type { LeadCategory } from "../types/lead-category";
import { useCachedResource } from "../utils/cached-resource";

const NONE: LeadCategory[] = [];

// The admin-editable lead_categories list, fetched once and shared by every
// screen (see utils/cached-resource.ts). enabled: false waits until needed.
export function useLeadCategories(enabled = true) {
  const { data, loading } = useCachedResource(leadCategoriesResource, enabled);
  return { categories: data ?? NONE, loading };
}
