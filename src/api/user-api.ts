import { apiClient } from "./api-client";
import type { ApiSuccess } from "../types/api";
import type { CreateUserPayload, TeamMember, UpdateUserPayload } from "../types/user";

export async function listUsers(): Promise<TeamMember[]> {
  const response = await apiClient.get<ApiSuccess<{ users: TeamMember[]; total: number }>>("/users", { params: { limit: 200 } });
  return response.data.data.users;
}

export async function createUser(payload: CreateUserPayload): Promise<TeamMember> {
  const response = await apiClient.post<ApiSuccess<TeamMember>>("/auth/register", payload);
  return response.data.data;
}

export async function getNextEmployeeCode(): Promise<string> {
  const response = await apiClient.get<ApiSuccess<{ employeeCode: string }>>("/users/next-employee-code");
  return response.data.data.employeeCode;
}

export async function listTerritories(): Promise<string[]> {
  const response = await apiClient.get<ApiSuccess<string[]>>("/users/territories");
  return response.data.data;
}

export async function updateUser(id: string, payload: UpdateUserPayload): Promise<TeamMember> {
  const response = await apiClient.patch<ApiSuccess<TeamMember>>(`/users/${id}`, payload);
  return response.data.data;
}

export interface UpdateOwnProfilePayload {
  smartfloAgentNumber: string;
}

export async function updateOwnProfile(payload: UpdateOwnProfilePayload): Promise<void> {
  await apiClient.patch<ApiSuccess<TeamMember>>("/users/me", payload);
}
