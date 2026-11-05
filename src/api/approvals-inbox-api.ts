import { apiClient } from "./api-client";
import type { ApiSuccess } from "../types/api";
import type { ApprovalHistoryResult, ApprovalInbox } from "../types/approval-inbox";

export async function getApprovalInbox(): Promise<ApprovalInbox> {
  const response = await apiClient.get<ApiSuccess<ApprovalInbox>>("/approvals/inbox");
  return response.data.data;
}

export async function getApprovalHistory(page = 1, limit = 50): Promise<ApprovalHistoryResult> {
  const response = await apiClient.get<ApiSuccess<ApprovalHistoryResult>>("/approvals/history", { params: { page, limit } });
  return response.data.data;
}
