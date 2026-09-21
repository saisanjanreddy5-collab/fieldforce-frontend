import { apiClient } from "./api-client";
import type { ApiSuccess } from "../types/api";
import type { CreateSalesTeamPayload, SalesTeam, Zone } from "../types/sales-team";

export async function listSalesTeams(): Promise<SalesTeam[]> {
  const response = await apiClient.get<ApiSuccess<SalesTeam[]>>("/sales-teams");
  return response.data.data;
}

export async function createSalesTeam(payload: CreateSalesTeamPayload): Promise<SalesTeam> {
  const response = await apiClient.post<ApiSuccess<SalesTeam>>("/sales-teams", payload);
  return response.data.data;
}

export async function listZones(): Promise<Zone[]> {
  const response = await apiClient.get<ApiSuccess<Zone[]>>("/geography/zones");
  return response.data.data;
}
