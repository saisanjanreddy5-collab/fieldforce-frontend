import { apiClient } from "./api-client";
import type { ApiSuccess } from "../types/api";
import type { CreatePipelineStagePayload, PipelineStage, UpdatePipelineStagePayload } from "../types/pipeline-stage";

export async function listPipelineStages(): Promise<PipelineStage[]> {
  const response = await apiClient.get<ApiSuccess<PipelineStage[]>>("/pipeline-stages");
  return response.data.data;
}

export async function createPipelineStage(payload: CreatePipelineStagePayload): Promise<PipelineStage> {
  const response = await apiClient.post<ApiSuccess<PipelineStage>>("/pipeline-stages", payload);
  return response.data.data;
}

export async function updatePipelineStage(key: string, payload: UpdatePipelineStagePayload): Promise<PipelineStage> {
  const response = await apiClient.patch<ApiSuccess<PipelineStage>>(`/pipeline-stages/${key}`, payload);
  return response.data.data;
}

export async function reorderPipelineStages(orderedKeys: string[]): Promise<PipelineStage[]> {
  const response = await apiClient.patch<ApiSuccess<PipelineStage[]>>("/pipeline-stages/reorder", { orderedKeys });
  return response.data.data;
}
