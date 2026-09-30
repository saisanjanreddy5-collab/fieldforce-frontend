export interface WebsiteLeadSource {
  id: string;
  name: string;
  apiKey: string;
  allowedOrigin: string | null;
  defaultCategory: string | null;
  defaultOwnerId: string | null;
  defaultOwnerName: string | null;
  utmTags: string | null;
  requireConsent: boolean;
  status: "active" | "paused";
  leadsCount: number;
  consentedCount: number;
  createdByName: string | null;
  createdAt: string;
}

export interface UpsertWebsiteLeadSourcePayload {
  name: string;
  allowedOrigin?: string;
  defaultCategory: string;
  defaultOwnerId?: string | null;
  utmTags?: string;
  requireConsent?: boolean;
}

export interface UpdateWebsiteLeadSourcePayload extends Partial<UpsertWebsiteLeadSourcePayload> {
  status?: "active" | "paused";
}
