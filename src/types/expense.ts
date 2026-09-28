export type ExpenseTypeKey = "travel" | "fuel" | "lodging" | "meals" | "client_entertainment" | "telecom" | "marketing_collateral";
export type ExpenseClaimStatus = "pending" | "approved" | "rejected" | "paid";
export type ExpenseDecision = "approved" | "rejected";

export interface ExpenseType {
  id: string;
  key: ExpenseTypeKey;
  label: string;
  color: string;
  limitAmount: number;
  limitUnit: "trip" | "km" | "night" | "day" | "meeting" | "month";
  metroLimitAmount: number | null;
  receiptRequired: boolean;
  requiresLinkedOpportunity: boolean;
  policyNote: string;
}

export interface ExpenseClaim {
  id: string;
  claimNumber: number;
  userId: string;
  userName: string | null;
  expenseTypeKey: ExpenseTypeKey;
  title: string;
  expenseDate: string;
  amount: number;
  quantity: number | null;
  linkedLeadId: string | null;
  linkedLeadLabel: string | null;
  linkedOpportunityId: string | null;
  linkedOpportunityLabel: string | null;
  hasReceipt: boolean;
  isPolicyBreach: boolean;
  policyLimitAtSubmission: number | null;
  status: ExpenseClaimStatus;
  approverId: string | null;
  approverName: string | null;
  approverDecision: ExpenseDecision | null;
  approverDecidedAt: string | null;
  secondApproverId: string | null;
  secondApproverName: string | null;
  secondApproverDecision: ExpenseDecision | null;
  secondApproverDecidedAt: string | null;
  decisionNote: string | null;
  paidBy: string | null;
  paidAt: string | null;
  createdAt: string;
}

export interface CreateExpenseClaimPayload {
  expenseTypeKey: ExpenseTypeKey;
  title: string;
  expenseDate: string;
  amount: number;
  quantity?: number;
  linkedLeadId?: string;
  linkedOpportunityId?: string;
  receipt?: File;
}
