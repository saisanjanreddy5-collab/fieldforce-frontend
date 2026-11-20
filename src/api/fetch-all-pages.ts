// For screens that work on a complete list (board/forecast views, pickers,
// summary stats): page 1 first (it says how many pages exist), then every
// remaining page at the same time - one page after another made the waits
// add up page by page. onProgress lets a screen show page 1 straight away.
export async function fetchAllPages<T>(
  fetchPage: (page: number, limit: number) => Promise<{ items: T[]; total: number }>,
  pageSize: number,
  onProgress?: (loadedSoFar: T[], total: number) => void
): Promise<T[]> {
  const first = await fetchPage(1, pageSize);
  onProgress?.(first.items, first.total);
  const remainingPages = Math.ceil(first.total / pageSize) - 1;
  if (remainingPages <= 0) return first.items;
  const rest = await Promise.all(Array.from({ length: remainingPages }, (_, i) => fetchPage(i + 2, pageSize)));
  const all = [...first.items, ...rest.flatMap((r) => r.items)];
  onProgress?.(all, first.total);
  return all;
}
