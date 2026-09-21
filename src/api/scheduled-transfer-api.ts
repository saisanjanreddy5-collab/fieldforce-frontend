import { apiClient } from "./api-client";
import type { ApiSuccess } from "../types/api";
import type {
  CreateExitPayload,
  CreateScheduledReassignPayload,
  CreateTerritoryTransferPayload,
  ScheduledTransfer,
} from "../types/scheduled-transfer";

export async function listScheduledTransfers(): Promise<ScheduledTransfer[]> {
  const response = await apiClient.get<ApiSuccess<ScheduledTransfer[]>>("/scheduled-transfers");
  return response.data.data;
}

export async function createTerritoryTransfer(payload: CreateTerritoryTransferPayload): Promise<ScheduledTransfer> {
  const response = await apiClient.post<ApiSuccess<ScheduledTransfer>>("/scheduled-transfers/territory", payload);
  return response.data.data;
}

export async function createScheduledReassign(payload: CreateScheduledReassignPayload): Promise<ScheduledTransfer> {
  const response = await apiClient.post<ApiSuccess<ScheduledTransfer>>("/scheduled-transfers/bulk-reassign", payload);
  return response.data.data;
}

export async function createExit(payload: CreateExitPayload): Promise<ScheduledTransfer> {
  const response = await apiClient.post<ApiSuccess<ScheduledTransfer>>("/scheduled-transfers/exit", payload);
  return response.data.data;
}
