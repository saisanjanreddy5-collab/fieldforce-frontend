import type { Lead, LeadConsent } from "./lead";

export type DocumentStatus = "not_uploaded" | "in_review" | "verified" | "missing";

export interface LeadDocument {
  id: string;
  leadId: string;
  docType: string;
  label: string;
  status: DocumentStatus;
  originalFilename: string | null;
  uploadedBy: string | null;
  uploadedAt: string | null;
  notes: string | null;
  hasFile: boolean;
}

export interface DocumentArchiveEntry {
  id: string;
  leadId: string;
  docType: string;
  label: string;
  originalFilename: string | null;
  uploadedBy: string | null;
  uploadedAt: string | null;
  archivedReason: "deleted" | "replaced";
  archivedAt: string;
}

export interface FofoHandoff {
  lead: Lead;
  documents: LeadDocument[];
  consent: LeadConsent | null;
}

export interface FofoOnboardingListItem {
  id: string;
  leadNumber: number | null;
  fullName: string;
  storeName: string | null;
  storeCity: string | null;
  storeState: string | null;
  status: string;
  pushStatus: string;
  expectedValue: number | null;
  ownerName: string | null;
  createdAt: string;
}
