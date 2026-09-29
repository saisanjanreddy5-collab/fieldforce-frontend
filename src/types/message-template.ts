export type TemplateChannel = "email" | "whatsapp";
export type TemplateStatus = "active" | "draft";

export interface MessageTemplate {
  id: string;
  key: string;
  name: string;
  channel: TemplateChannel;
  triggerNote: string | null;
  subject: string | null;
  body: string;
  status: TemplateStatus;
  sortOrder: number;
  updatedAt: string;
}

export interface CreateMessageTemplatePayload {
  key: string;
  name: string;
  channel: TemplateChannel;
  triggerNote?: string;
  subject?: string;
  body: string;
  status?: TemplateStatus;
}

export interface UpdateMessageTemplatePayload {
  name?: string;
  triggerNote?: string | null;
  subject?: string | null;
  body?: string;
  status?: TemplateStatus;
}
