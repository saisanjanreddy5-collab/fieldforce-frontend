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

// "City" = an India Post district.
export interface City {
  id: string;
  name: string;
  stateId: string;
}

// One post office: its name and pincode, under a city and state.
export interface Area {
  id: string;
  name: string;
  pincode: string | null;
  latitude: number | null;
  longitude: number | null;
  cityId: string;
  cityName: string;
  stateId: string;
  stateName: string;
}

export async function listCities(stateId: string): Promise<City[]> {
  const response = await apiClient.get<ApiSuccess<{ cities: City[] }>>("/geography/cities", { params: { stateId } });
  return response.data.data.cities;
}

export async function listAreas(cityId: string): Promise<Area[]> {
  const response = await apiClient.get<ApiSuccess<{ areas: Area[] }>>("/geography/areas", { params: { cityId } });
  return response.data.data.areas;
}
