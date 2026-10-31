import { apiClient } from "./api-client";
import type { ApiSuccess } from "../types/api";
import type { SupportTicket, SupportTicketMessage } from "../types/support-ticket";

export interface ListSupportTicketsResult {
  supportTickets: SupportTicket[];
  total: number;
}

export async function listSupportTickets(
  filters: { leadId?: string; assignedTo?: string; page?: number; limit?: number } = {}
): Promise<ListSupportTicketsResult> {
  const response = await apiClient.get<ApiSuccess<ListSupportTicketsResult>>("/support-tickets", { params: { limit: 200, ...filters } });
  return response.data.data;
}

// A single listSupportTickets() call silently capped at its own default
// limit (200) - anything past that was invisible, not just slow. Same
// drain-every-real-page pattern as opportunity-api.ts's listAllOpportunities.
export async function listAllSupportTickets(
  onProgress?: (loadedSoFar: SupportTicket[], total: number) => void
): Promise<SupportTicket[]> {
  const PAGE_SIZE = 200;
  const first = await listSupportTickets({ page: 1, limit: PAGE_SIZE });
  let all = first.supportTickets;
  onProgress?.(all, first.total);

  let page = 2;
  while (all.length < first.total) {
    const next = await listSupportTickets({ page, limit: PAGE_SIZE });
    if (next.supportTickets.length === 0) break;
    all = [...all, ...next.supportTickets];
    onProgress?.(all, first.total);
    page += 1;
  }
  return all;
}

export async function createSupportTicket(payload: {
  leadId: string;
  subject: string;
  description?: string;
  priority: string;
}): Promise<SupportTicket> {
  const response = await apiClient.post<ApiSuccess<SupportTicket>>("/support-tickets", payload);
  return response.data.data;
}

export async function updateTicketStatus(ticketId: string, status: string): Promise<SupportTicket> {
  const response = await apiClient.patch<ApiSuccess<SupportTicket>>(`/support-tickets/${ticketId}/status`, { status });
  return response.data.data;
}

export async function assignTicket(ticketId: string, assignedTo: string | null): Promise<SupportTicket> {
  const response = await apiClient.patch<ApiSuccess<SupportTicket>>(`/support-tickets/${ticketId}/assign`, { assignedTo });
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
