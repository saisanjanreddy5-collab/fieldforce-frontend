import { apiClient } from "./api-client";
import type { ApiSuccess } from "../types/api";
import type { QrCampaign, QrCampaignSummary, UpdateQrCampaignPayload, UpsertQrCampaignPayload } from "../types/qr-campaign";

export async function listQrCampaigns(): Promise<QrCampaign[]> {
  const response = await apiClient.get<ApiSuccess<QrCampaign[]>>("/qr-campaigns");
  return response.data.data;
}

export async function getQrCampaignSummary(): Promise<QrCampaignSummary> {
  const response = await apiClient.get<ApiSuccess<QrCampaignSummary>>("/qr-campaigns/summary");
  return response.data.data;
}

export async function createQrCampaign(payload: UpsertQrCampaignPayload): Promise<QrCampaign> {
  const response = await apiClient.post<ApiSuccess<QrCampaign>>("/qr-campaigns", payload);
  return response.data.data;
}

export async function updateQrCampaign(id: string, payload: UpdateQrCampaignPayload): Promise<QrCampaign> {
  const response = await apiClient.patch<ApiSuccess<QrCampaign>>(`/qr-campaigns/${id}`, payload);
  return response.data.data;
}
