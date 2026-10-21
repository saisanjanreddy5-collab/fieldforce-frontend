import { useCallback, useEffect, useState } from "react";
import * as leadApi from "../api/lead-api";

// Same pattern as useLeadCategories/usePipelineStages - except there's no
// admin-editable config table behind this one. Source is free text (set by
// bulk import, website/QR capture, or typed into a lead's Inquiry Source),
// so the options here are just whatever distinct values are really sitting
// on real leads right now - which changes constantly as people edit leads,
// unlike the mostly-static Category/Stage lists. `refetch` is exposed so
// the Filters popover can pull a fresh list every time it's opened, rather
// than the one fetched when the Leads page first mounted going stale for
// the rest of the session.
export function useLeadSources() {
  const [sources, setSources] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(() => {
    setLoading(true);
    return leadApi
      .listLeadSources()
      .then(setSources)
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { sources, loading, refetch };
}
