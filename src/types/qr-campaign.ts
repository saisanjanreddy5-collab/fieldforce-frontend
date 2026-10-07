export interface QrFieldConfig {
  email?: boolean;
  investmentCapacity?: boolean;
  existingStore?: boolean;
  preferredLanguage?: boolean;
  photo?: boolean;
}

export interface QrCampaign {
  id: string;
  name: string;
  code: string | null;
  placement: string | null;
  defaultCategory: string | null;
  defaultOwnerId: string | null;
  defaultOwnerName: string | null;
  utmTags: string | null;
  expiresAt: string | null;
  requireConsent: boolean;
  captureScanLocation: boolean;
  fieldConfig: QrFieldConfig;
  status: "active" | "paused";
  isExpired: boolean;
  scanCount: number;
  leadsCount: number;
  conversionRate: number | null;
  consentedCount: number;
  createdByName: string | null;
  createdAt: string;
}

export interface QrCampaignSummary {
  activeCount: number;
  totalCount: number;
  totalScans: number;
  leadsCount: number;
  conversionRate: number | null;
  consentRate: number | null;
}

export interface UpsertQrCampaignPayload {
  name: string;
  placement?: string;
  defaultCategory: string;
  defaultOwnerId?: string | null;
  utmTags?: string;
  expiresAt?: string | null;
  requireConsent?: boolean;
  captureScanLocation?: boolean;
  fieldConfig?: QrFieldConfig;
}

export interface UpdateQrCampaignPayload extends Partial<UpsertQrCampaignPayload> {
  status?: "active" | "paused";
}

export interface PublicQrCampaignInfo {
  active: boolean;
  reason?: "not_found" | "paused" | "expired";
  name?: string;
  fieldConfig?: QrFieldConfig;
  requireConsent?: boolean;
  categoryLabel?: string | null;
  resolvedCity?: string | null;
  states?: { id: string; name: string }[];
  resolvedStateId?: string | null;
}

export interface PublicQrSubmitPayload {
  fullName: string;
  phone: string;
  cityOrPincode: string;
  stateId?: string;
  email?: string;
  investmentCapacity?: number;
  existingStore?: boolean;
  preferredLanguage?: string;
  consentGranted: boolean;
  photo?: File;
}
