import { apiClient } from "./api-client";
import type { ApiSuccess } from "../types/api";
import type { ApprovalInbox } from "../types/approval-inbox";

export async function getApprovalInbox(): Promise<ApprovalInbox> {
  const response = await apiClient.get<ApiSuccess<ApprovalInbox>>("/approvals/inbox");
  return response.data.data;
}
