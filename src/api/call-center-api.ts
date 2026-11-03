import { apiClient } from "./api-client";
import type { ApiSuccess } from "../types/api";
import type { Call } from "../types/call";

export interface ListCallsResult {
  calls: Call[];
  total: number;
}

export async function listCalls(filters: { assignedTo?: string; page?: number; limit?: number } = {}): Promise<ListCallsResult> {
  const response = await apiClient.get<ApiSuccess<ListCallsResult>>("/call-center", { params: { limit: 200, ...filters } });
  return response.data.data;
}

// A single listCalls() call silently capped at its own default limit (200) -
// anything past that was invisible, not just slow. Same drain-every-real-
// page pattern as quote-api.ts's listAllQuotes - not a new idea.
export async function listAllCalls(
  filters: { assignedTo?: string } = {},
  onProgress?: (loadedSoFar: Call[], total: number) => void
): Promise<Call[]> {
  const PAGE_SIZE = 200;
  const first = await listCalls({ ...filters, page: 1, limit: PAGE_SIZE });
  let all = first.calls;
  onProgress?.(all, first.total);

  let page = 2;
  while (all.length < first.total) {
    const next = await listCalls({ ...filters, page, limit: PAGE_SIZE });
    if (next.calls.length === 0) break;
    all = [...all, ...next.calls];
    onProgress?.(all, first.total);
    page += 1;
  }
  return all;
}

export async function listUpcomingCalls(limit = 20): Promise<Call[]> {
  const response = await apiClient.get<ApiSuccess<Call[]>>("/call-center/upcoming", { params: { limit } });
  return response.data.data;
}

export interface CallCenterStats {
  callsToday: number;
  connectedPercent: number;
  avgHandleSeconds: number | null;
  recordedPercent: number;
  inQueue: number;
  overdueInQueue: number;
}

export async function getStats(): Promise<CallCenterStats> {
  const response = await apiClient.get<ApiSuccess<CallCenterStats>>("/call-center/stats");
  return response.data.data;
}
