import { useMemo } from "react";
import { leadInquiryOptionsResource } from "../api/lead-inquiry-option-api";
import type { LeadInquiryOption } from "../types/lead-inquiry-option";
import { useCachedResource } from "../utils/cached-resource";

const NONE: LeadInquiryOption[] = [];

// The admin-editable Inquiry Category/Source lists behind the Lead form
// (manual-entry leads only - QR/Website leads get these auto-filled and
// locked). One cached request for both lists, split client-side.
// enabled: false waits until the form is actually open.
export function useLeadInquiryOptions(enabled = true) {
  const { data, loading } = useCachedResource(leadInquiryOptionsResource, enabled);
  const options = data ?? NONE;

  // Memoized so these keep the same identity until the options actually
  // change. LeadFormDrawer re-applies the lead's saved Inquiry Category/Source
  // whenever these change - fresh arrays on every render made that re-run on
  // every re-render (e.g. Save & Next switching tabs) and wipe what the user
  // had just picked before it was ever saved.
  const categoryOptions = useMemo(() => options.filter((o) => o.fieldType === "category"), [options]);
  const sourceOptions = useMemo(() => options.filter((o) => o.fieldType === "source"), [options]);

  return { categoryOptions, sourceOptions, loading };
}
