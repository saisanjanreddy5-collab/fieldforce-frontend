import { apiClient } from "./api-client";
import type { ApiSuccess } from "../types/api";
import type { CreateLeadPayload, Lead, LeadConsent, LeadListFilters, LeadListResult } from "../types/lead";
import type { LeadTimelineEntry } from "../types/lead-timeline";
import type { LeadsExportResult } from "../types/lead-export";

export async function listLeads(filters: LeadListFilters): Promise<LeadListResult> {
  const response = await apiClient.get<ApiSuccess<LeadListResult>>("/leads", { params: filters });
  return response.data.data;
}

// Drains every real page for one status filter - a caller passing a fixed
// `limit` (e.g. Call Center's own queue, scoped to one person's work) would
// otherwise silently truncate once that one status bucket grows past it.
// Same drain-every-real-page pattern as opportunity-api.ts's
// listAllOpportunities, just without a progress callback - these queues are
// small/personal, not a page-wide dataset worth a visible progress banner.
export async function listAllLeadsForStatus(filters: Omit<LeadListFilters, "page" | "limit">): Promise<Lead[]> {
  // Unlike quotes/customers/support-tickets, the /leads endpoint's own
  // validator caps limit at 100 (listLeadsQuerySchema) - 200 here 422s.
  const PAGE_SIZE = 100;
  const first = await listLeads({ ...filters, page: 1, limit: PAGE_SIZE });
  let all = first.leads;
  let page = 2;
  while (all.length < first.total) {
    const next = await listLeads({ ...filters, page, limit: PAGE_SIZE });
    if (next.leads.length === 0) break;
    all = [...all, ...next.leads];
    page += 1;
  }
  return all;
}

// Same filters as listLeads, minus page/limit - returns every matching lead
// (not one page) plus its full history/remarks, for the Leads page's Export
// button to turn into a real multi-sheet workbook.
export async function exportLeads(filters: Omit<LeadListFilters, "page" | "limit">): Promise<LeadsExportResult> {
  const response = await apiClient.get<ApiSuccess<LeadsExportResult>>("/leads/export", { params: filters });
  return response.data.data;
}

export async function listTerritories(): Promise<string[]> {
  const response = await apiClient.get<ApiSuccess<string[]>>("/leads/territories");
  return response.data.data;
}

export async function listLeadSources(): Promise<string[]> {
  const response = await apiClient.get<ApiSuccess<string[]>>("/leads/sources");
  return response.data.data;
}

// "My queue"'s own second section - leads this person used to own and has
// since handed off via Send to Field. Read-only (inOwnerScope: false on
// every one), same as reopening one directly.
export async function listHandedOffLeads(): Promise<Lead[]> {
  const response = await apiClient.get<ApiSuccess<Lead[]>>("/leads/handed-off");
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

// Call Center's own "Add lead" action - a contact who called in directly,
// not from a marketing import. Always lands in the caller's own Call Center
// queue (owner/status are decided server-side, never taken from this
// payload - see lead-call-center-service.ts's createOwnQueueLead).
export async function createOwnQueueLead(payload: CreateLeadPayload): Promise<Lead> {
  const response = await apiClient.post<ApiSuccess<Lead>>("/leads/queue", payload);
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

export async function logCallDisposition(
  id: string,
  payload: { disposition: CallDisposition; notes?: string; callbackAt?: string }
): Promise<Lead> {
  const response = await apiClient.post<ApiSuccess<Lead>>(`/leads/${id}/call-dispositions`, payload);
  return response.data.data;
}

export async function qualifyLead(id: string): Promise<Lead> {
  const response = await apiClient.post<ApiSuccess<Lead>>(`/leads/${id}/qualify`);
  return response.data.data;
}

export async function escalateToSlc(id: string): Promise<Lead> {
  const response = await apiClient.post<ApiSuccess<Lead>>(`/leads/${id}/escalate-to-slc`);
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

export async function getLeadTimeline(id: string): Promise<LeadTimelineEntry[]> {
  const response = await apiClient.get<ApiSuccess<LeadTimelineEntry[]>>(`/leads/${id}/timeline`);
  return response.data.data;
}
