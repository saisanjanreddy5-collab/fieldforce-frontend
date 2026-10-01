import { apiClient } from "./api-client";
import type { ApiSuccess } from "../types/api";
import type { TeamRollupGroup } from "../types/team-rollup";

export async function getTeamRollup(): Promise<TeamRollupGroup[]> {
  const response = await apiClient.get<ApiSuccess<TeamRollupGroup[]>>("/opportunities/team-rollup");
  return response.data.data;
}
