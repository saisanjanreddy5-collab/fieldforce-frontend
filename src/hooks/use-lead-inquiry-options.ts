import { useEffect, useState } from "react";
import * as leadInquiryOptionApi from "../api/lead-inquiry-option-api";
import type { LeadInquiryOption } from "../types/lead-inquiry-option";

// Same pattern as useLeadCategories/usePipelineStages - a real admin-editable
// list backing the Lead form's Inquiry Category/Source fields (for manual-
// entry leads only - QR/Website leads get these two auto-filled and locked
// elsewhere, untouched by this). Fetches both lists in one call and splits
// them client-side since the whole table is tiny.
export function useLeadInquiryOptions() {
  const [options, setOptions] = useState<LeadInquiryOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    leadInquiryOptionApi
      .listLeadInquiryOptions()
      .then(setOptions)
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  return {
    categoryOptions: options.filter((o) => o.fieldType === "category"),
    sourceOptions: options.filter((o) => o.fieldType === "source"),
    loading,
  };
}
