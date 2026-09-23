import { apiClient } from "./api-client";
import type { ApiSuccess } from "../types/api";
import type { CreateLeadPayload, Lead, LeadConsent, LeadListFilters, LeadListResult } from "../types/lead";

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

export async function getLeadConsent(id: string): Promise<LeadConsent | null> {
  const response = await apiClient.get<ApiSuccess<LeadConsent | null>>(`/leads/${id}/consent`);
  return response.data.data;
}
