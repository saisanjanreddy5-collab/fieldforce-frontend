import { apiClient } from "./api-client";
import type { ApiSuccess } from "../types/api";
import type {
  CreateMessageTemplatePayload,
  MessageTemplate,
  TemplateChannel,
  UpdateMessageTemplatePayload,
} from "../types/message-template";

export async function listMessageTemplates(channel?: TemplateChannel): Promise<MessageTemplate[]> {
  const response = await apiClient.get<ApiSuccess<MessageTemplate[]>>("/message-templates", { params: { channel } });
  return response.data.data;
}

export async function createMessageTemplate(payload: CreateMessageTemplatePayload): Promise<MessageTemplate> {
  const response = await apiClient.post<ApiSuccess<MessageTemplate>>("/message-templates", payload);
  return response.data.data;
}

export async function updateMessageTemplate(key: string, payload: UpdateMessageTemplatePayload): Promise<MessageTemplate> {
  const response = await apiClient.patch<ApiSuccess<MessageTemplate>>(`/message-templates/${key}`, payload);
  return response.data.data;
}
