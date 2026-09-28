import { apiClient } from "./api-client";
import type { ApiSuccess } from "../types/api";
import type { CreateExpenseClaimPayload, ExpenseClaim, ExpenseType } from "../types/expense";

export async function listExpenseTypes(): Promise<ExpenseType[]> {
  const response = await apiClient.get<ApiSuccess<ExpenseType[]>>("/expenses/types");
  return response.data.data;
}

export async function listMyClaims(): Promise<ExpenseClaim[]> {
  const response = await apiClient.get<ApiSuccess<ExpenseClaim[]>>("/expenses/mine");
  return response.data.data;
}

export async function listTeamClaims(): Promise<ExpenseClaim[]> {
  const response = await apiClient.get<ApiSuccess<ExpenseClaim[]>>("/expenses/team");
  return response.data.data;
}

export async function listPendingApprovals(): Promise<ExpenseClaim[]> {
  const response = await apiClient.get<ApiSuccess<ExpenseClaim[]>>("/expenses/pending-approvals");
  return response.data.data;
}

export async function createExpenseClaim(payload: CreateExpenseClaimPayload): Promise<ExpenseClaim> {
  const formData = new FormData();
  formData.append("expenseTypeKey", payload.expenseTypeKey);
  formData.append("title", payload.title);
  formData.append("expenseDate", payload.expenseDate);
  formData.append("amount", String(payload.amount));
  if (payload.quantity !== undefined) formData.append("quantity", String(payload.quantity));
  if (payload.linkedLeadId) formData.append("linkedLeadId", payload.linkedLeadId);
  if (payload.linkedOpportunityId) formData.append("linkedOpportunityId", payload.linkedOpportunityId);
  if (payload.receipt) formData.append("receipt", payload.receipt);

  const response = await apiClient.post<ApiSuccess<ExpenseClaim>>("/expenses", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data.data;
}

export async function decideExpenseClaim(id: string, decision: "approved" | "rejected", note?: string): Promise<ExpenseClaim> {
  const response = await apiClient.patch<ApiSuccess<ExpenseClaim>>(`/expenses/${id}/decision`, { decision, note });
  return response.data.data;
}

export async function markClaimPaid(id: string): Promise<ExpenseClaim> {
  const response = await apiClient.patch<ApiSuccess<ExpenseClaim>>(`/expenses/${id}/mark-paid`, {});
  return response.data.data;
}

// Auth is a bearer header, not a cookie, so a plain <a href> can't
// authenticate a download - fetch it as a blob and trigger the save
// ourselves instead, same pattern as fofo-onboarding-api's downloadDocument.
export async function downloadReceipt(id: string, filename: string): Promise<void> {
  const response = await apiClient.get(`/expenses/${id}/receipt`, { responseType: "blob" });
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
