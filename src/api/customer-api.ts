import { apiClient } from "./api-client";
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

export async function getTimeline(id: string): Promise<TimelineFeedItem[]> {
  const response = await apiClient.get<ApiSuccess<TimelineFeedItem[]>>(`/customers/${id}/timeline`);
  return response.data.data;
}
