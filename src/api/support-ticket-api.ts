import { apiClient } from "./api-client";
import type { ApiSuccess } from "../types/api";
import type { SupportTicket, SupportTicketMessage } from "../types/support-ticket";

export interface ListSupportTicketsResult {
  supportTickets: SupportTicket[];
  total: number;
}

export async function listSupportTickets(filters: { leadId?: string; page?: number; limit?: number } = {}): Promise<ListSupportTicketsResult> {
  const response = await apiClient.get<ApiSuccess<ListSupportTicketsResult>>("/support-tickets", { params: { limit: 200, ...filters } });
  return response.data.data;
}

export async function createSupportTicket(payload: { leadId: string; subject: string; description?: string }): Promise<SupportTicket> {
  const response = await apiClient.post<ApiSuccess<SupportTicket>>("/support-tickets", payload);
  return response.data.data;
}

export async function getSupportTicket(id: string): Promise<SupportTicket> {
  const response = await apiClient.get<ApiSuccess<SupportTicket>>(`/support-tickets/${id}`);
  return response.data.data;
}

export async function listMessages(ticketId: string): Promise<SupportTicketMessage[]> {
  const response = await apiClient.get<ApiSuccess<SupportTicketMessage[]>>(`/support-tickets/${ticketId}/messages`);
  return response.data.data;
}

export async function replyToTicket(ticketId: string, body: string): Promise<SupportTicketMessage> {
  const response = await apiClient.post<ApiSuccess<SupportTicketMessage>>(`/support-tickets/${ticketId}/messages`, { message: body });
  return response.data.data;
}
