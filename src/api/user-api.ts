import { apiClient } from "./api-client";
import type { ApiSuccess } from "../types/api";
import type { CreateUserPayload, TeamMember } from "../types/user";

export async function listUsers(): Promise<TeamMember[]> {
  const response = await apiClient.get<ApiSuccess<TeamMember[]>>("/users");
  return response.data.data;
}

export async function createUser(payload: CreateUserPayload): Promise<TeamMember> {
  const response = await apiClient.post<ApiSuccess<TeamMember>>("/auth/register", payload);
  return response.data.data;
}
