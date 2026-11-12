export interface WhatsappMessage {
  id: string;
  leadId: string;
  direction: "inbound" | "outbound";
  // Null on a pure media message with no caption - never defaults to "" on
  // the backend, so an empty string here would be a real (if odd) caption,
  // not "no caption".
  body: string | null;
  status: string;
  createdAt: string;
  mediaUrl: string | null;
  mediaMimeType: string | null;
  mediaFileName: string | null;
}
