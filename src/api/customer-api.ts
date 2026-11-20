import { apiClient } from "./api-client";
import { fetchAllPages } from "./fetch-all-pages";
import type { ApiSuccess } from "../types/api";
import type { Customer, UpdateCustomerPayload } from "../types/customer";
import type { TimelineFeedItem, TransactionFeedItem } from "../types/customer-extras";

export interface ListCustomersResult {
  customers: Customer[];
  total: number;
}

export async function listCustomers(filters: { search?: string; status?: string; page?: number; limit?: number } = {}): Promise<ListCustomersResult> {
  const response = await apiClient.get<ApiSuccess<ListCustomersResult>>("/customers", { params: { limit: 200, ...filters } });
  return response.data.data;
}

// Every customer, not just the first page of 200.
export function listAllCustomers(onProgress?: (loadedSoFar: Customer[], total: number) => void): Promise<Customer[]> {
  return fetchAllPages((page, limit) => listCustomers({ page, limit }).then((r) => ({ items: r.customers, total: r.total })), 200, onProgress);
}

export async function getCustomer(id: string): Promise<Customer> {
  const response = await apiClient.get<ApiSuccess<Customer>>(`/customers/${id}`);
  return response.data.data;
}

export async function updateCustomer(id: string, payload: UpdateCustomerPayload): Promise<Customer> {
  const response = await apiClient.patch<ApiSuccess<Customer>>(`/customers/${id}`, payload);
  return response.data.data;
}

export async function getTransactions(id: string): Promise<TransactionFeedItem[]> {
  const response = await apiClient.get<ApiSuccess<TransactionFeedItem[]>>(`/customers/${id}/transactions`);
  return response.data.data;
}

// Support-portal (Frappe Helpdesk) access for a customer: given once one of
// their deals is Won (or an Admin grants it early), with a one-click invite.
export interface SupportPortalStatus {
  enabled: boolean;
  qualifies: boolean;
  manual: boolean;
  active: boolean;
  invitedAt: string | null;
  invitedEmail: string | null;
}

export async function getSupportPortalStatus(id: string): Promise<SupportPortalStatus> {
  const response = await apiClient.get<ApiSuccess<SupportPortalStatus>>(`/customers/${id}/support-portal`);
  return response.data.data;
}

export async function sendSupportPortalInvite(id: string, grant = false): Promise<SupportPortalStatus> {
  const response = await apiClient.post<ApiSuccess<SupportPortalStatus>>(`/customers/${id}/support-portal/invite`, { grant });
  return response.data.data;
}

export async function getTimeline(id: string): Promise<TimelineFeedItem[]> {
  const response = await apiClient.get<ApiSuccess<TimelineFeedItem[]>>(`/customers/${id}/timeline`);
  return response.data.data;
}
