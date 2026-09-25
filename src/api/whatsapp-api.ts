import { apiClient } from "./api-client";
import type { ApiSuccess } from "../types/api";
import type { WhatsappMessage } from "../types/whatsapp";

export async function listMessagesForLead(leadId: string): Promise<WhatsappMessage[]> {
  const response = await apiClient.get<ApiSuccess<WhatsappMessage[]>>(`/leads/${leadId}/whatsapp-messages`);
  return response.data.data;
}

export async function sendMessage(leadId: string, body: string): Promise<WhatsappMessage> {
  const response = await apiClient.post<ApiSuccess<WhatsappMessage>>(`/leads/${leadId}/whatsapp-messages`, { body });
  return response.data.data;
}
