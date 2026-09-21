import { apiClient } from "./api-client";
import type { ApiSuccess } from "../types/api";
import type { StructureAxis } from "../types/structure-axis";

export async function listStructureAxes(): Promise<StructureAxis[]> {
  const response = await apiClient.get<ApiSuccess<StructureAxis[]>>("/structure-axes");
  return response.data.data;
}

export async function setAxisEnabled(id: string, isEnabled: boolean): Promise<StructureAxis> {
  const response = await apiClient.patch<ApiSuccess<StructureAxis>>(`/structure-axes/${id}`, { isEnabled });
  return response.data.data;
}
