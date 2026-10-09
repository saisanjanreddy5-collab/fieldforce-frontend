export interface SupportTicket {
  id: string;
  leadId: string;
  leadFullName: string | null;
  subject: string;
  description: string | null;
  status: string;
  frappeTicketName: string | null;
  createdBy: string | null;
  createdByName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SupportTicketMessage {
  id: string;
  ticketId: string;
  direction: "inbound" | "outbound";
  body: string;
  sentBy: string | null;
  createdAt: string;
}
