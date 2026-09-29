import { apiClient } from "./api-client";
import type { ApiSuccess } from "../types/api";
import type { PublicQrCampaignInfo, PublicQrSubmitPayload } from "../types/qr-campaign";

export async function getPublicQrCampaign(code: string): Promise<PublicQrCampaignInfo> {
  const response = await apiClient.get<ApiSuccess<PublicQrCampaignInfo>>(`/public/qr/${code}`);
  return response.data.data;
}

export async function submitPublicQrCapture(code: string, payload: PublicQrSubmitPayload): Promise<{ leadNumber: number | null }> {
  const formData = new FormData();
  formData.append("fullName", payload.fullName);
  formData.append("phone", payload.phone);
  formData.append("cityOrPincode", payload.cityOrPincode);
  if (payload.email) formData.append("email", payload.email);
  if (payload.investmentCapacity !== undefined) formData.append("investmentCapacity", String(payload.investmentCapacity));
  if (payload.existingStore !== undefined) formData.append("existingStore", String(payload.existingStore));
  if (payload.preferredLanguage) formData.append("preferredLanguage", payload.preferredLanguage);
  formData.append("consentGranted", String(payload.consentGranted));
  if (payload.photo) formData.append("photo", payload.photo);

  const response = await apiClient.post<ApiSuccess<{ leadNumber: number | null }>>(`/public/qr/${code}/submit`, formData);
  return response.data.data;
}
