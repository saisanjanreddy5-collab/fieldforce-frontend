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
