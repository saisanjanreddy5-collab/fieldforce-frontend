export interface WhatsappMessage {
  id: string;
  leadId: string;
  direction: "inbound" | "outbound";
  body: string;
  status: string;
  createdAt: string;
}
