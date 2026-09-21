export interface Delegation {
  id: string;
  userId: string;
  delegateId: string;
  startDate: string;
  endDate: string;
  createdBy: string | null;
  createdAt: string;
}

export interface CreateDelegationPayload {
  userId: string;
  delegateId: string;
  startDate: string;
  endDate: string;
}
