import { apiClient } from "./api-client";
import type { ApiSuccess } from "../types/api";
import type {
  CreateLeadInquiryOptionPayload,
  InquiryOptionFieldType,
  LeadInquiryOption,
  UpdateLeadInquiryOptionPayload,
} from "../types/lead-inquiry-option";

export async function listLeadInquiryOptions(fieldType?: InquiryOptionFieldType): Promise<LeadInquiryOption[]> {
  const response = await apiClient.get<ApiSuccess<LeadInquiryOption[]>>("/lead-inquiry-options", {
    params: fieldType ? { fieldType } : undefined,
  });
  return response.data.data;
}

export async function createLeadInquiryOption(payload: CreateLeadInquiryOptionPayload): Promise<LeadInquiryOption> {
  const response = await apiClient.post<ApiSuccess<LeadInquiryOption>>("/lead-inquiry-options", payload);
  return response.data.data;
}

export async function updateLeadInquiryOption(id: string, payload: UpdateLeadInquiryOptionPayload): Promise<LeadInquiryOption> {
  const response = await apiClient.patch<ApiSuccess<LeadInquiryOption>>(`/lead-inquiry-options/${id}`, payload);
  return response.data.data;
}
