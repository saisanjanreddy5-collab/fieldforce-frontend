import { apiClient } from "./api-client";
import type { ApiSuccess } from "../types/api";

export interface State {
  id: string;
  name: string;
  zoneId: string | null;
  gstCode: string | null;
}

export async function listStates(): Promise<State[]> {
  const response = await apiClient.get<ApiSuccess<{ states: State[]; total: number }>>("/geography/states", {
    params: { limit: 200 },
  });
  return response.data.data.states;
}
