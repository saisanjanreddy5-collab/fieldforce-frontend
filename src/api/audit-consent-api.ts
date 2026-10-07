import { apiClient } from "./api-client";
import type { ApiSuccess } from "../types/api";
import type { AuditEvent, ConsentBucket, ConsentRecord } from "../types/audit-consent";

export interface ListAuditLogResult {
  events: AuditEvent[];
  total: number;
}

export async function listAuditLog(page = 1, limit = 100): Promise<ListAuditLogResult> {
  const response = await apiClient.get<ApiSuccess<ListAuditLogResult>>("/audit-consent/log", { params: { page, limit } });
  return response.data.data;
}

export async function getConsentRegister(): Promise<ConsentBucket[]> {
  const response = await apiClient.get<ApiSuccess<ConsentBucket[]>>("/audit-consent/consent-register");
  return response.data.data;
}

export interface ListConsentRecordsResult {
  records: ConsentRecord[];
  total: number;
}

export async function listConsentRecords(page = 1, limit = 200): Promise<ListConsentRecordsResult> {
  const response = await apiClient.get<ApiSuccess<ListConsentRecordsResult>>("/audit-consent/consent-records", { params: { page, limit } });
  return response.data.data;
}
