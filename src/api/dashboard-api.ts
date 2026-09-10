import { apiClient } from "./api-client";
import type { ApiSuccess } from "../types/api";
import type { OverviewStats, PipelineStageStat } from "../types/dashboard";
import type { Activity } from "../types/activity";

export async function getOverview(): Promise<OverviewStats> {
  const response = await apiClient.get<ApiSuccess<OverviewStats>>("/dashboard/overview");
  return response.data.data;
}

export async function getPipelineByStage(): Promise<PipelineStageStat[]> {
  const response = await apiClient.get<ApiSuccess<PipelineStageStat[]>>("/dashboard/pipeline-by-stage");
  return response.data.data;
}

export async function getMyActivities(assignedTo: string): Promise<Activity[]> {
  const response = await apiClient.get<ApiSuccess<Activity[]>>("/activities", {
    params: { assignedTo, limit: 50 },
  });
  return response.data.data;
}
