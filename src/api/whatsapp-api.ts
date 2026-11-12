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

export async function sendMedia(leadId: string, file: File, caption?: string): Promise<WhatsappMessage> {
  const formData = new FormData();
  formData.append("file", file);
  if (caption) formData.append("caption", caption);
  const response = await apiClient.post<ApiSuccess<WhatsappMessage>>(`/leads/${leadId}/whatsapp-messages/media`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data.data;
}
