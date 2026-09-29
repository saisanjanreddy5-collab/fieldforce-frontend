import { apiClient } from "./api-client";
import type { ApiSuccess } from "../types/api";
import type { TeamAvailability } from "../types/team-dashboard";

export async function getTeamAvailability(): Promise<TeamAvailability> {
  const response = await apiClient.get<ApiSuccess<TeamAvailability>>("/team-dashboard/availability");
  return response.data.data;
}
