import { apiClient } from "./api-client";
import type { ApiSuccess } from "../types/api";
import type { FofoHandoff, FofoOnboardingListItem, LeadDocument } from "../types/fofo-onboarding";

export async function listFofoOnboardings(): Promise<FofoOnboardingListItem[]> {
  const response = await apiClient.get<ApiSuccess<FofoOnboardingListItem[]>>("/fofo-onboarding");
  return response.data.data;
}

export async function getHandoff(leadId: string): Promise<FofoHandoff> {
  const response = await apiClient.get<ApiSuccess<FofoHandoff>>(`/fofo-onboarding/${leadId}`);
  return response.data.data;
}

export async function decideStep(stepId: string, decision: "approved" | "rejected"): Promise<FofoHandoff> {
  const response = await apiClient.patch<ApiSuccess<FofoHandoff>>(`/fofo-onboarding/steps/${stepId}/decide`, { decision });
  return response.data.data;
}

export async function pushToOnboardingApp(leadId: string): Promise<FofoHandoff> {
  const response = await apiClient.post<ApiSuccess<FofoHandoff>>(`/fofo-onboarding/${leadId}/push`);
  return response.data.data;
}

export async function uploadDocument(leadId: string, docType: string, file: File): Promise<LeadDocument> {
  const formData = new FormData();
  formData.append("docType", docType);
  formData.append("file", file);
  const response = await apiClient.post<ApiSuccess<LeadDocument>>(`/fofo-onboarding/${leadId}/documents`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data.data;
}

export async function updateDocumentStatus(
  documentId: string,
  status: "verified" | "missing" | "in_review",
  notes?: string
): Promise<LeadDocument> {
  const response = await apiClient.patch<ApiSuccess<LeadDocument>>(`/fofo-onboarding/documents/${documentId}`, { status, notes });
  return response.data.data;
}

export async function deleteDocument(documentId: string): Promise<LeadDocument> {
  const response = await apiClient.delete<ApiSuccess<LeadDocument>>(`/fofo-onboarding/documents/${documentId}`);
  return response.data.data;
}

// Auth is a bearer header, not a cookie, so a plain <a href> can't
// authenticate a download - fetch it as a blob and trigger the save
// ourselves instead.
export async function downloadDocument(documentId: string, filename: string): Promise<void> {
  const response = await apiClient.get(`/fofo-onboarding/documents/${documentId}/file`, { responseType: "blob" });
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
