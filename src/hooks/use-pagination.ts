import { useCallback, useEffect, useState } from "react";
import { PAGE_SIZE_OPTIONS } from "../components/ListPagination";

function readSavedSize(key: string, fallback: number): number {
  try {
    const saved = Number(localStorage.getItem(`pageSize:${key}`));
    return PAGE_SIZE_OPTIONS.includes(saved) ? saved : fallback;
  } catch {
    return fallback;
  }
}

// Page + rows-per-page state for one list. The chosen rows-per-page is
// remembered per list (in this browser), and the page snaps back into range
// when the list shrinks (e.g. after filtering).
//   const pager = usePagination("quotes", 10);
//   pager.slice(rows)  // client-side lists
//   <ListPagination {...pager.props(total)} />
export function usePagination(key: string, defaultPageSize = 10, total?: number) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(() => readSavedSize(key, defaultPageSize));

  const onChange = useCallback(
    (nextPage: number, nextSize: number) => {
      setPage(nextPage);
      if (nextSize !== pageSize) {
        setPageSize(nextSize);
        try {
          localStorage.setItem(`pageSize:${key}`, String(nextSize));
        } catch {
          // Remembering is a convenience only.
        }
      }
    },
    [key, pageSize]
  );

  useEffect(() => {
    // 0 = still loading (or genuinely empty) - keep the reader's place.
    if (total === undefined || total === 0) return;
    const lastPage = Math.max(1, Math.ceil(total / pageSize));
    if (page > lastPage) setPage(lastPage);
  }, [total, pageSize, page]);

  const slice = useCallback(<T,>(items: T[]) => items.slice((page - 1) * pageSize, page * pageSize), [page, pageSize]);
  const props = (listTotal: number) => ({ page, pageSize, total: listTotal, onChange });

  return { page, pageSize, setPage, onChange, slice, props };
}
