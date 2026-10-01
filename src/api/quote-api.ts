import { apiClient } from "./api-client";
import type { ApiSuccess } from "../types/api";
import type {
  CreateQuotePayload,
  ListQuotesFilters,
  Quote,
  QuoteDetail,
  QuoteListItem,
  QuoteStatus,
  UpdateQuotePayload,
} from "../types/quote";

export interface QuoteListResult {
  quotes: QuoteListItem[];
  total: number;
}

export async function listQuotes(filters: ListQuotesFilters & { page?: number; limit?: number } = {}): Promise<QuoteListResult> {
  const response = await apiClient.get<ApiSuccess<QuoteListResult>>("/quotes", { params: { limit: 200, ...filters } });
  return response.data.data;
}

export async function listQuotesForLead(leadId: string): Promise<QuoteListItem[]> {
  const response = await apiClient.get<ApiSuccess<QuoteListItem[]>>(`/leads/${leadId}/quotes`);
  return response.data.data;
}

export async function listQuotesForOpportunity(opportunityId: string): Promise<QuoteListItem[]> {
  const response = await apiClient.get<ApiSuccess<QuoteListItem[]>>(`/opportunities/${opportunityId}/quotes`);
  return response.data.data;
}

export async function getQuote(id: string): Promise<QuoteDetail> {
  const response = await apiClient.get<ApiSuccess<QuoteDetail>>(`/quotes/${id}`);
  return response.data.data;
}

export async function createQuote(payload: CreateQuotePayload): Promise<QuoteDetail> {
  const response = await apiClient.post<ApiSuccess<{ quote: Quote; version: QuoteDetail["currentVersion"] }>>("/quotes", payload);
  const { quote, version } = response.data.data;
  return { quote, currentVersion: version, versions: [version] };
}

export async function updateQuote(id: string, payload: UpdateQuotePayload): Promise<QuoteDetail> {
  const response = await apiClient.patch<ApiSuccess<{ quote: Quote; version: QuoteDetail["currentVersion"] }>>(`/quotes/${id}`, payload);
  const { quote, version } = response.data.data;
  return { quote, currentVersion: version, versions: [version] };
}

export async function updateQuoteStatus(id: string, status: QuoteStatus): Promise<Quote> {
  const response = await apiClient.patch<ApiSuccess<Quote>>(`/quotes/${id}/status`, { status });
  return response.data.data;
}

// Auth is a bearer header, not a cookie, so a plain <a href> can't
// authenticate a download - fetch it as a blob and trigger the save
// ourselves, same pattern as expense-api's downloadReceipt.
export async function downloadQuotePdf(id: string, filename: string): Promise<void> {
  const response = await apiClient.get(`/quotes/${id}/pdf`, { responseType: "blob" });
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
