import { apiClient } from "./api-client";
import type { ApiSuccess } from "../types/api";
import type { CreateUserPayload, TeamMember, UpdateUserPayload } from "../types/user";

// Every caller here wants the complete roster (owner pickers, assignment
// rules, People list, report filters) - never a partial page - so a single
// capped request silently dropping anyone past #200 was a real bug, not
// just slow, once the sales force grew past that. Drains every real page,
// same pattern as quote-api.ts's listAllQuotes.
export async function listUsers(): Promise<TeamMember[]> {
  const PAGE_SIZE = 200;
  const first = await apiClient.get<ApiSuccess<{ users: TeamMember[]; total: number }>>("/users", { params: { page: 1, limit: PAGE_SIZE } });
  let all = first.data.data.users;
  const total = first.data.data.total;

  let page = 2;
  while (all.length < total) {
    const next = await apiClient.get<ApiSuccess<{ users: TeamMember[]; total: number }>>("/users", { params: { page, limit: PAGE_SIZE } });
    if (next.data.data.users.length === 0) break;
    all = [...all, ...next.data.data.users];
    page += 1;
  }
  return all;
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

// Admin-only - sets someone else's password directly (no current-password
// proof, since the admin's own session is the proof here) and logs them out
// everywhere. See user-routes.ts's own comment on why this is a separate
// permission from the general users.update above.
export async function resetPassword(id: string, newPassword: string): Promise<void> {
  await apiClient.post(`/users/${id}/reset-password`, { newPassword });
}

export interface UpdateOwnProfilePayload {
  smartfloAgentNumber: string;
}

export async function updateOwnProfile(payload: UpdateOwnProfilePayload): Promise<void> {
  await apiClient.patch<ApiSuccess<TeamMember>>("/users/me", payload);
}
