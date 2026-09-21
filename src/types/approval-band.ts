export type ApprovalRequestType = "discount" | "customer_creation" | "credit_limit" | "expense_claim";

export interface ApprovalBand {
  id: string;
  requestType: ApprovalRequestType;
  bandName: string;
  rangeFrom: number;
  rangeTo: number | null;
  approverLevelId: string | null;
  countersignedByLevelId: string | null;
  slaHours: number | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateApprovalBandPayload {
  requestType: ApprovalRequestType;
  bandName: string;
  rangeFrom?: number;
  rangeTo?: number;
  approverLevelId?: string;
  countersignedByLevelId?: string;
  slaHours?: number;
  sortOrder?: number;
}

export interface UpdateApprovalBandPayload {
  bandName?: string;
  rangeFrom?: number;
  rangeTo?: number | null;
  approverLevelId?: string | null;
  countersignedByLevelId?: string | null;
  slaHours?: number | null;
  sortOrder?: number;
}
