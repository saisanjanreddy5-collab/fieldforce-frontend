import { useEffect, useMemo, useState } from "react";
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

  // Memoized so these keep the same identity until the options actually
  // load. LeadFormDrawer re-applies the lead's saved Inquiry Category/Source
  // whenever these change - fresh arrays on every render made that re-run on
  // every re-render (e.g. Save & Next switching tabs) and wipe what the user
  // had just picked before it was ever saved.
  const categoryOptions = useMemo(() => options.filter((o) => o.fieldType === "category"), [options]);
  const sourceOptions = useMemo(() => options.filter((o) => o.fieldType === "source"), [options]);

  return { categoryOptions, sourceOptions, loading };
}
