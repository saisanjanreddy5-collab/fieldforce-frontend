import { apiClient } from "./api-client";
import type { ApiSuccess } from "../types/api";
import type { CreateLeadPayload, Lead, LeadConsent, LeadListFilters, LeadListResult } from "../types/lead";
import type { AuditEvent } from "../types/audit-consent";

export async function listLeads(filters: LeadListFilters): Promise<LeadListResult> {
  const response = await apiClient.get<ApiSuccess<LeadListResult>>("/leads", { params: filters });
  return response.data.data;
}

export async function listTerritories(): Promise<string[]> {
  const response = await apiClient.get<ApiSuccess<string[]>>("/leads/territories");
  return response.data.data;
}

export interface LeadQuickFilterCounts {
  all: number;
  myLeads: number;
  unassigned: number;
  overdue: number;
  fofo: number;
  highScore: number;
}

export async function getQuickFilterCounts(): Promise<LeadQuickFilterCounts> {
  const response = await apiClient.get<ApiSuccess<LeadQuickFilterCounts>>("/leads/quick-filter-counts");
  return response.data.data;
}

export async function getLead(id: string): Promise<Lead> {
  const response = await apiClient.get<ApiSuccess<Lead>>(`/leads/${id}`);
  return response.data.data;
}

export async function createLead(payload: CreateLeadPayload): Promise<Lead> {
  const response = await apiClient.post<ApiSuccess<Lead>>("/leads", payload);
  return response.data.data;
}

export async function updateLead(id: string, payload: Partial<CreateLeadPayload>): Promise<Lead> {
  const response = await apiClient.patch<ApiSuccess<Lead>>(`/leads/${id}`, payload);
  return response.data.data;
}

export interface BulkImportResult {
  created: number;
  skipped: { row: number; reason: string }[];
  errors: { row: number; message: string }[];
}

export async function bulkImportLeads(rows: Record<string, unknown>[]): Promise<BulkImportResult> {
  const response = await apiClient.post<ApiSuccess<BulkImportResult>>("/leads/bulk-import", { rows });
  return response.data.data;
}

export async function getLeadConsent(id: string): Promise<LeadConsent | null> {
  const response = await apiClient.get<ApiSuccess<LeadConsent | null>>(`/leads/${id}/consent`);
  return response.data.data;
}

// The business's own real call-disposition values (see
// call-qualification-validator.ts on the backend) - not invented here.
export const CALL_DISPOSITIONS = [
  "Ringing",
  "Not Reachable",
  "Switched Off",
  "Language",
  "Call Back",
  "Call Done And Interested",
  "Call Done And Not Interested",
] as const;
export type CallDisposition = (typeof CALL_DISPOSITIONS)[number];

export interface SwapCandidate {
  id: string;
  name: string;
  email: string;
}

export async function logCallDisposition(id: string, payload: { disposition: CallDisposition; notes?: string }): Promise<Lead> {
  const response = await apiClient.post<ApiSuccess<Lead>>(`/leads/${id}/call-dispositions`, payload);
  return response.data.data;
}

export async function qualifyLead(id: string): Promise<Lead> {
  const response = await apiClient.post<ApiSuccess<Lead>>(`/leads/${id}/qualify`);
  return response.data.data;
}

export async function getSwapCandidates(id: string): Promise<SwapCandidate[]> {
  const response = await apiClient.get<ApiSuccess<SwapCandidate[]>>(`/leads/${id}/swap-candidates`);
  return response.data.data;
}

// ownerId is only needed when more than one field employee covers the
// lead's pincode - omit it to let the backend auto-resolve the one obvious
// match (or report why it can't).
export async function sendToField(id: string, ownerId?: string): Promise<Lead> {
  const response = await apiClient.post<ApiSuccess<Lead>>(`/leads/${id}/send-to-field`, ownerId ? { ownerId } : {});
  return response.data.data;
}

export async function reassignLead(id: string, ownerId: string): Promise<Lead> {
  const response = await apiClient.post<ApiSuccess<Lead>>(`/leads/${id}/reassign`, { ownerId });
  return response.data.data;
}

export async function getLeadHistory(id: string): Promise<AuditEvent[]> {
  const response = await apiClient.get<ApiSuccess<AuditEvent[]>>(`/leads/${id}/history`);
  return response.data.data;
}
