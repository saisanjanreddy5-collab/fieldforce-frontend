import { apiClient } from "./api-client";
import type { ApiSuccess } from "../types/api";
import type { DivisionChannel } from "../types/classification";

export async function listDivisionChannels(): Promise<DivisionChannel[]> {
  const response = await apiClient.get<ApiSuccess<DivisionChannel[]>>("/classification/division-channels");
  return response.data.data;
}
