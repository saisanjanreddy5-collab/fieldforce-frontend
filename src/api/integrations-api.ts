import { apiClient } from "./api-client";
import type { ApiSuccess } from "../types/api";

export interface IntegrationsStatus {
  whatsapp: boolean;
  smartflo: boolean;
}

export async function getIntegrationsStatus(): Promise<IntegrationsStatus> {
  const response = await apiClient.get<ApiSuccess<IntegrationsStatus>>("/integrations/status");
  return response.data.data;
}
