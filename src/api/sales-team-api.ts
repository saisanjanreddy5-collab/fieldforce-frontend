import { apiClient } from "./api-client";
import type { ApiSuccess } from "../types/api";
import type { CreateSalesTeamPayload, SalesTeam, State, Zone } from "../types/sales-team";

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

export async function listStates(zoneId?: string): Promise<State[]> {
  const response = await apiClient.get<ApiSuccess<State[]>>("/geography/states", { params: zoneId ? { zoneId } : undefined });
  return response.data.data;
}
