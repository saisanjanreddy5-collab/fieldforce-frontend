import { apiClient } from "./api-client";
import type { ApiSuccess } from "../types/api";
import type { ApprovalHistoryResult, ApprovalInbox } from "../types/approval-inbox";

export async function getApprovalInbox(): Promise<ApprovalInbox> {
  const response = await apiClient.get<ApiSuccess<ApprovalInbox>>("/approvals/inbox");
  return response.data.data;
}

// Every past decision must stay visible in the History tab (not just the
// newest ones) - the UI's own pagination/search (ApprovalsPage.tsx) already
// slices this client-side, so one call fetches the whole merged set rather
// than paging it over the network.
export async function getApprovalHistory(page = 1, limit = 30000): Promise<ApprovalHistoryResult> {
  const response = await apiClient.get<ApiSuccess<ApprovalHistoryResult>>("/approvals/history", { params: { page, limit } });
  return response.data.data;
}
