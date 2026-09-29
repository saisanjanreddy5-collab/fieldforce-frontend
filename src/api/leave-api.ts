import { apiClient } from "./api-client";
import type { ApiSuccess } from "../types/api";
import type {
  CreateLeaveRequestPayload,
  GrantCompOffPayload,
  LeaveBalance,
  LeaveContext,
  LeaveRequest,
  LeaveType,
  LeaveTypeKey,
  UpdateLeaveTypePayload,
} from "../types/leave";

export async function listLeaveTypes(): Promise<LeaveType[]> {
  const response = await apiClient.get<ApiSuccess<LeaveType[]>>("/leave/types");
  return response.data.data;
}

export async function updateLeaveType(key: LeaveTypeKey, payload: UpdateLeaveTypePayload): Promise<LeaveType> {
  const response = await apiClient.patch<ApiSuccess<LeaveType>>(`/leave/types/${key}`, payload);
  return response.data.data;
}

export async function getMyBalances(): Promise<LeaveBalance[]> {
  const response = await apiClient.get<ApiSuccess<LeaveBalance[]>>("/leave/balances");
  return response.data.data;
}

export async function getLeaveContext(): Promise<LeaveContext> {
  const response = await apiClient.get<ApiSuccess<LeaveContext>>("/leave/context");
  return response.data.data;
}

export async function listMyRequests(): Promise<LeaveRequest[]> {
  const response = await apiClient.get<ApiSuccess<LeaveRequest[]>>("/leave/mine");
  return response.data.data;
}

export async function listTeamRequests(): Promise<LeaveRequest[]> {
  const response = await apiClient.get<ApiSuccess<LeaveRequest[]>>("/leave/team");
  return response.data.data;
}

export async function listPendingApprovals(): Promise<LeaveRequest[]> {
  const response = await apiClient.get<ApiSuccess<LeaveRequest[]>>("/leave/pending-approvals");
  return response.data.data;
}

export async function createLeaveRequest(payload: CreateLeaveRequestPayload): Promise<LeaveRequest> {
  const response = await apiClient.post<ApiSuccess<LeaveRequest>>("/leave", payload);
  return response.data.data;
}

export async function decideLeaveRequest(id: string, decision: "approved" | "rejected"): Promise<LeaveRequest> {
  const response = await apiClient.patch<ApiSuccess<LeaveRequest>>(`/leave/${id}/decision`, { decision });
  return response.data.data;
}

export async function cancelLeaveRequest(id: string): Promise<LeaveRequest> {
  const response = await apiClient.patch<ApiSuccess<LeaveRequest>>(`/leave/${id}/cancel`, {});
  return response.data.data;
}

export async function grantCompOff(payload: GrantCompOffPayload): Promise<LeaveBalance[]> {
  const response = await apiClient.post<ApiSuccess<LeaveBalance[]>>("/leave/comp-off-credits", payload);
  return response.data.data;
}
