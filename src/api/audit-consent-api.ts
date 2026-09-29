import { apiClient } from "./api-client";
import type { ApiSuccess } from "../types/api";
import type { AuditEvent, ConsentBucket, ConsentRecord } from "../types/audit-consent";

export async function listAuditLog(): Promise<AuditEvent[]> {
  const response = await apiClient.get<ApiSuccess<AuditEvent[]>>("/audit-consent/log");
  return response.data.data;
}

export async function getConsentRegister(): Promise<ConsentBucket[]> {
  const response = await apiClient.get<ApiSuccess<ConsentBucket[]>>("/audit-consent/consent-register");
  return response.data.data;
}

export async function listConsentRecords(): Promise<ConsentRecord[]> {
  const response = await apiClient.get<ApiSuccess<ConsentRecord[]>>("/audit-consent/consent-records");
  return response.data.data;
}
