import { apiClient } from "./api-client";
import type { ApiSuccess } from "../types/api";
import type { CreateDelegationPayload, Delegation } from "../types/delegation";

export async function listDelegations(): Promise<Delegation[]> {
  const response = await apiClient.get<ApiSuccess<{ delegations: Delegation[]; total: number }>>("/delegations", {
    params: { limit: 200 },
  });
  return response.data.data.delegations;
}

export async function createDelegation(payload: CreateDelegationPayload): Promise<Delegation> {
  const response = await apiClient.post<ApiSuccess<Delegation>>("/delegations", payload);
  return response.data.data;
}

export async function deleteDelegation(id: string): Promise<void> {
  await apiClient.delete<ApiSuccess<null>>(`/delegations/${id}`);
}
