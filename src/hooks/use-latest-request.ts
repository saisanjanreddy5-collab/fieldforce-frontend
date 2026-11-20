import { useMemo, useRef } from "react";

// For screens where a newer request can overtake an older one (typing in a
// search box, switching filters or tabs quickly): only the most recently
// started request may update the screen; a slower, older answer is ignored.
//   const latest = useLatestRequest();
//   const token = latest.start();
//   api.load().then((data) => latest.isCurrent(token) && setData(data));
export function useLatestRequest() {
  const counter = useRef(0);
  return useMemo(
    () => ({
      start: () => ++counter.current,
      isCurrent: (token: number) => token === counter.current,
      /** Makes every request already in flight stale (e.g. the box was cleared). */
      cancel: () => {
        counter.current += 1;
      },
    }),
    []
  );
}
