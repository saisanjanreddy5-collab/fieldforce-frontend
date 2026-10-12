import { apiClient } from "./api-client";
import type { ApiSuccess } from "../types/api";
import type {
  AddressPayload,
  ContactPayload,
  CustomerAddress,
  CustomerContact,
  Invoice,
  InvoicePayload,
  Payment,
  PaymentPayload,
  SalesOrder,
  SalesOrderPayload,
} from "../types/customer-extras";

export async function listContacts(customerId: string): Promise<CustomerContact[]> {
  const response = await apiClient.get<ApiSuccess<CustomerContact[]>>(`/customers/${customerId}/contacts`);
  return response.data.data;
}
export async function createContact(customerId: string, payload: ContactPayload): Promise<CustomerContact> {
  const response = await apiClient.post<ApiSuccess<CustomerContact>>(`/customers/${customerId}/contacts`, payload);
  return response.data.data;
}
export async function updateContact(id: string, payload: Partial<ContactPayload>): Promise<CustomerContact> {
  const response = await apiClient.patch<ApiSuccess<CustomerContact>>(`/customer-contacts/${id}`, payload);
  return response.data.data;
}
export async function deleteContact(id: string): Promise<void> {
  await apiClient.delete(`/customer-contacts/${id}`);
}

export async function listAddresses(customerId: string): Promise<CustomerAddress[]> {
  const response = await apiClient.get<ApiSuccess<CustomerAddress[]>>(`/customers/${customerId}/addresses`);
  return response.data.data;
}
export async function createAddress(customerId: string, payload: AddressPayload): Promise<CustomerAddress> {
  const response = await apiClient.post<ApiSuccess<CustomerAddress>>(`/customers/${customerId}/addresses`, payload);
  return response.data.data;
}
export async function updateAddress(id: string, payload: Partial<AddressPayload>): Promise<CustomerAddress> {
  const response = await apiClient.patch<ApiSuccess<CustomerAddress>>(`/customer-addresses/${id}`, payload);
  return response.data.data;
}
export async function deleteAddress(id: string): Promise<void> {
  await apiClient.delete(`/customer-addresses/${id}`);
}

export async function listSalesOrders(customerId: string): Promise<SalesOrder[]> {
  const response = await apiClient.get<ApiSuccess<SalesOrder[]>>(`/customers/${customerId}/sales-orders`);
  return response.data.data;
}
export async function createSalesOrder(customerId: string, payload: SalesOrderPayload): Promise<SalesOrder> {
  const response = await apiClient.post<ApiSuccess<SalesOrder>>(`/customers/${customerId}/sales-orders`, payload);
  return response.data.data;
}
export async function deleteSalesOrder(id: string): Promise<void> {
  await apiClient.delete(`/sales-orders/${id}`);
}

export async function listInvoices(customerId: string): Promise<Invoice[]> {
  const response = await apiClient.get<ApiSuccess<Invoice[]>>(`/customers/${customerId}/invoices`);
  return response.data.data;
}
export async function createInvoice(customerId: string, payload: InvoicePayload): Promise<Invoice> {
  const response = await apiClient.post<ApiSuccess<Invoice>>(`/customers/${customerId}/invoices`, payload);
  return response.data.data;
}
export async function deleteInvoice(id: string): Promise<void> {
  await apiClient.delete(`/invoices/${id}`);
}

export async function listPayments(customerId: string): Promise<Payment[]> {
  const response = await apiClient.get<ApiSuccess<Payment[]>>(`/customers/${customerId}/payments`);
  return response.data.data;
}
export async function createPayment(customerId: string, payload: PaymentPayload): Promise<Payment> {
  const response = await apiClient.post<ApiSuccess<Payment>>(`/customers/${customerId}/payments`, payload);
  return response.data.data;
}
export async function deletePayment(id: string): Promise<void> {
  await apiClient.delete(`/payments/${id}`);
}
