import { apiClient } from "./api-client";
import type { ApiSuccess } from "../types/api";
import type { LeadDocument } from "../types/fofo-onboarding";

// Same lead_documents table/files as fofo-onboarding-api.ts's document
// functions, just reached through the general /leads/:leadId/documents
// front door (leads.view/update) instead of the FOFO-onboarding-specific
// one - for using a document slot (e.g. "consent_form") on a lead that
// isn't in FOFO onboarding at all.

export async function listDocuments(leadId: string): Promise<LeadDocument[]> {
  const response = await apiClient.get<ApiSuccess<LeadDocument[]>>(`/leads/${leadId}/documents`);
  return response.data.data;
}

export async function uploadDocument(leadId: string, docType: string, file: File): Promise<LeadDocument> {
  const formData = new FormData();
  formData.append("docType", docType);
  formData.append("file", file);
  const response = await apiClient.post<ApiSuccess<LeadDocument>>(`/leads/${leadId}/documents`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data.data;
}

export async function deleteDocument(documentId: string): Promise<LeadDocument> {
  const response = await apiClient.delete<ApiSuccess<LeadDocument>>(`/leads/documents/${documentId}`);
  return response.data.data;
}

// Auth is a bearer header, not a cookie, so a plain <a href> can't
// authenticate a download - fetch it as a blob and trigger the save ourselves.
export async function downloadDocument(documentId: string, filename: string): Promise<void> {
  const response = await apiClient.get(`/leads/documents/${documentId}/file`, { responseType: "blob" });
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
