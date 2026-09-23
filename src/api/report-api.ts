import { apiClient } from "./api-client";
import type { ApiSuccess } from "../types/api";
import type {
  B2BGroupRow,
  FofoCohortRow,
  LeadSourceRoiRow,
  SalespersonPerformanceRow,
  SavedReportView,
  StateWiseRow,
} from "../types/report";

export async function getSalespersonPerformance(filters: { month?: string; zoneId?: string }): Promise<SalespersonPerformanceRow[]> {
  const response = await apiClient.get<ApiSuccess<SalespersonPerformanceRow[]>>("/reports/salesperson", { params: filters });
  return response.data.data;
}

export async function getStateWise(): Promise<StateWiseRow[]> {
  const response = await apiClient.get<ApiSuccess<StateWiseRow[]>>("/reports/state-wise");
  return response.data.data;
}

export async function getB2BGroup(): Promise<B2BGroupRow[]> {
  const response = await apiClient.get<ApiSuccess<B2BGroupRow[]>>("/reports/b2b-group");
  return response.data.data;
}

export async function getLeadSourceRoi(): Promise<LeadSourceRoiRow[]> {
  const response = await apiClient.get<ApiSuccess<LeadSourceRoiRow[]>>("/reports/lead-source-roi");
  return response.data.data;
}

export async function getFofoCohortRetention(): Promise<FofoCohortRow[]> {
  const response = await apiClient.get<ApiSuccess<FofoCohortRow[]>>("/reports/fofo-cohort-retention");
  return response.data.data;
}

export async function listSavedViews(reportKey: string): Promise<SavedReportView[]> {
  const response = await apiClient.get<ApiSuccess<SavedReportView[]>>("/reports/saved-views", { params: { reportKey } });
  return response.data.data;
}

export async function createSavedView(reportKey: string, name: string, filters: Record<string, unknown>): Promise<SavedReportView> {
  const response = await apiClient.post<ApiSuccess<SavedReportView>>("/reports/saved-views", { reportKey, name, filters });
  return response.data.data;
}

export async function deleteSavedView(id: string): Promise<void> {
  await apiClient.delete(`/reports/saved-views/${id}`);
}
