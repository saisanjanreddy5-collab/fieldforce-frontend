import { apiClient } from "./api-client";
import type { ApiSuccess } from "../types/api";
import type { TestAccessSummary } from "../types/test-access";

export async function getTestAccessSummary(userId: string): Promise<TestAccessSummary> {
  const response = await apiClient.get<ApiSuccess<TestAccessSummary>>(`/users/${userId}/test-access`);
  return response.data.data;
}
