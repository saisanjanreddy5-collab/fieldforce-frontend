import { apiClient } from "./api-client";
import type { ApiSuccess } from "../types/api";
import type { GlobalSearchResult } from "../types/global-search";

export async function globalSearch(query: string): Promise<GlobalSearchResult> {
  const response = await apiClient.get<ApiSuccess<GlobalSearchResult>>("/search", { params: { q: query } });
  return response.data.data;
}
