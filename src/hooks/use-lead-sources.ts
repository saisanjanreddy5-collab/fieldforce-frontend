import { useCallback, useState } from "react";
import * as leadApi from "../api/lead-api";

// Source is free text (bulk import, website/QR capture, typed Inquiry
// Source), so the options are whatever distinct values sit on leads right
// now - they change constantly, so they're not cached: `refetch` pulls a
// fresh list each time the Filters popover opens, and nothing is fetched
// before that.
export function useLeadSources() {
  const [sources, setSources] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const refetch = useCallback(() => {
    setLoading(true);
    return leadApi
      .listLeadSources()
      .then(setSources)
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  return { sources, loading, refetch };
}
