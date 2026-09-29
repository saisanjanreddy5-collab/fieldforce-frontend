import { useEffect, useState } from "react";
import * as leadCategoryApi from "../api/lead-category-api";
import type { LeadCategory } from "../types/lead-category";

// Replaces the old hardcoded LEAD_CATEGORY_VALUES array - same pattern as
// usePipelineStages, reading the real, admin-editable lead_categories table.
export function useLeadCategories() {
  const [categories, setCategories] = useState<LeadCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    leadCategoryApi
      .listLeadCategories()
      .then(setCategories)
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  return { categories, loading };
}
