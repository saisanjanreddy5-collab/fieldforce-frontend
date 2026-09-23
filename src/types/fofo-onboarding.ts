import type { Lead } from "./lead";

export type ApprovalStepStatus = "pending" | "approved" | "rejected" | "not_applicable";

export interface ApprovalStep {
  id: string;
  leadId: string;
  stepOrder: number;
  roleLabel: string;
  approverUserId: string | null;
  approverName: string | null;
  status: ApprovalStepStatus;
  conditionNote: string | null;
  decidedBy: string | null;
  decidedAt: string | null;
  isCurrentTurn: boolean;
}

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

export interface FofoHandoff {
  lead: Lead;
  approvalSteps: ApprovalStep[];
  documents: LeadDocument[];
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
}
