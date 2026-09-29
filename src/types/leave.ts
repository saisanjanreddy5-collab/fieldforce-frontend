export type LeaveTypeKey = "casual" | "sick" | "earned" | "comp_off";
export type LeaveRequestKind = LeaveTypeKey | "half_day" | "wfh";
export type LeaveRequestStatus = "pending" | "approved" | "rejected" | "cancelled";
export type LeaveDecision = "approved" | "rejected";

export interface LeaveType {
  id: string;
  key: LeaveTypeKey;
  label: string;
  color: string;
  annualDays: number | null;
  accrualPerMonth: number | null;
  carryForwardCap: number | null;
  maxConsecutiveDays: number | null;
  noticeDays: number | null;
  medicalNoteAfterDays: number | null;
  expiresAfterDays: number | null;
  requiresSecondApprover: boolean;
  policyNote: string;
  approverNote: string;
}

export interface LeaveBalance extends LeaveType {
  entitlement: number | null;
  used: number;
  available: number | null;
  earned: number | null;
}

export interface LeaveRequest {
  id: string;
  userId: string;
  userName: string | null;
  kind: LeaveRequestKind;
  startDate: string;
  endDate: string;
  daysCount: number;
  reason: string;
  coverUserId: string | null;
  coverUserName: string | null;
  status: LeaveRequestStatus;
  approverId: string | null;
  approverDecision: LeaveDecision | null;
  approverDecidedAt: string | null;
  secondApproverId: string | null;
  secondApproverDecision: LeaveDecision | null;
  secondApproverDecidedAt: string | null;
  createdAt: string;
}

export interface CreateLeaveRequestPayload {
  kind: LeaveRequestKind;
  startDate: string;
  endDate: string;
  reason: string;
  coverUserId?: string;
}

export interface GrantCompOffPayload {
  userId: string;
  earnedDate: string;
  reason?: string;
}

export interface LeaveContextPerson {
  id: string;
  name: string;
}

export interface LeaveContext {
  managerId: string | null;
  managerName: string | null;
  peers: LeaveContextPerson[];
  directReports: LeaveContextPerson[];
}

export interface UpdateLeaveTypePayload {
  annualDays?: number | null;
  accrualPerMonth?: number | null;
  carryForwardCap?: number | null;
  maxConsecutiveDays?: number | null;
  noticeDays?: number | null;
  medicalNoteAfterDays?: number | null;
  expiresAfterDays?: number | null;
  requiresSecondApprover?: boolean;
  policyNote?: string;
}
