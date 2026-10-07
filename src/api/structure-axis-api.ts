import { apiClient } from "./api-client";
import type { ApiSuccess } from "../types/api";
import type { StructureAxis } from "../types/structure-axis";

export async function listStructureAxes(): Promise<StructureAxis[]> {
  const response = await apiClient.get<ApiSuccess<{ structureAxes: StructureAxis[]; total: number }>>("/structure-axes", {
    params: { limit: 200 },
  });
  return response.data.data.structureAxes;
}

export async function setAxisEnabled(id: string, isEnabled: boolean): Promise<StructureAxis> {
  const response = await apiClient.patch<ApiSuccess<StructureAxis>>(`/structure-axes/${id}`, { isEnabled });
  return response.data.data;
}
