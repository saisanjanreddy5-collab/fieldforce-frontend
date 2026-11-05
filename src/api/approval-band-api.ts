import { apiClient } from "./api-client";
import type { ApiSuccess } from "../types/api";
import type { ApprovalBand, CreateApprovalBandPayload, UpdateApprovalBandPayload } from "../types/approval-band";

export async function listApprovalBands(archived?: boolean): Promise<ApprovalBand[]> {
  const response = await apiClient.get<ApiSuccess<{ approvalBands: ApprovalBand[]; total: number }>>("/approval-bands", {
    params: { limit: 200, archived },
  });
  return response.data.data.approvalBands;
}

export async function createApprovalBand(payload: CreateApprovalBandPayload): Promise<ApprovalBand> {
  const response = await apiClient.post<ApiSuccess<ApprovalBand>>("/approval-bands", payload);
  return response.data.data;
}

export async function updateApprovalBand(id: string, payload: UpdateApprovalBandPayload): Promise<ApprovalBand> {
  const response = await apiClient.patch<ApiSuccess<ApprovalBand>>(`/approval-bands/${id}`, payload);
  return response.data.data;
}

export async function deleteApprovalBand(id: string): Promise<void> {
  await apiClient.delete<ApiSuccess<null>>(`/approval-bands/${id}`);
}

export async function restoreApprovalBand(id: string): Promise<void> {
  await apiClient.patch<ApiSuccess<null>>(`/approval-bands/${id}/restore`);
}
