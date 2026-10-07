import { apiClient } from "./api-client";
import type { ApiSuccess } from "../types/api";
import type { CreateSalesTeamPayload, SalesTeam, State, Zone } from "../types/sales-team";

export async function listSalesTeams(): Promise<SalesTeam[]> {
  const response = await apiClient.get<ApiSuccess<{ salesTeams: SalesTeam[]; total: number }>>("/sales-teams", {
    params: { limit: 200 },
  });
  return response.data.data.salesTeams;
}

export async function createSalesTeam(payload: CreateSalesTeamPayload): Promise<SalesTeam> {
  const response = await apiClient.post<ApiSuccess<SalesTeam>>("/sales-teams", payload);
  return response.data.data;
}

export async function listZones(): Promise<Zone[]> {
  const response = await apiClient.get<ApiSuccess<{ zones: Zone[]; total: number }>>("/geography/zones", { params: { limit: 200 } });
  return response.data.data.zones;
}

export async function listStates(zoneId?: string): Promise<State[]> {
  const response = await apiClient.get<ApiSuccess<{ states: State[]; total: number }>>("/geography/states", {
    params: { limit: 200, ...(zoneId ? { zoneId } : {}) },
  });
  return response.data.data.states;
}
