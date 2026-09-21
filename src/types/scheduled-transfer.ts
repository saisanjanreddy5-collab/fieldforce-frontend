export type TransferType = "territory" | "bulk_reassign" | "exit";
export type TransferStatus = "scheduled" | "completed";

export interface ScheduledTransfer {
  id: string;
  transferType: TransferType;
  fromUserId: string | null;
  toUserId: string | null;
  oldTerritory: string | null;
  newTerritory: string | null;
  effectiveDate: string;
  status: TransferStatus;
  leadCount: number;
  opportunityCount: number;
  note: string | null;
  createdBy: string | null;
  createdAt: string;
  appliedAt: string | null;
}

export interface CreateTerritoryTransferPayload {
  fromUserId: string;
  newTerritory: string;
  effectiveDate: string;
  note?: string;
}

export interface CreateScheduledReassignPayload {
  fromUserId: string;
  toUserId: string;
  effectiveDate: string;
  note?: string;
}

export interface CreateExitPayload {
  fromUserId: string;
  effectiveDate: string;
}
