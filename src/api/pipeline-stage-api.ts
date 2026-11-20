import { apiClient } from "./api-client";
import type { ApiSuccess } from "../types/api";
import { createCachedResource } from "../utils/cached-resource";
import type { CreatePipelineStagePayload, PipelineStage, UpdatePipelineStagePayload } from "../types/pipeline-stage";

export async function listPipelineStages(): Promise<PipelineStage[]> {
  const response = await apiClient.get<ApiSuccess<{ pipelineStages: PipelineStage[]; total: number }>>("/pipeline-stages", {
    params: { limit: 200 },
  });
  return response.data.data.pipelineStages;
}

/** Shared, cached copy for the screens that pick a stage (see usePipelineStages). */
export const pipelineStagesResource = createCachedResource(listPipelineStages);

export async function createPipelineStage(payload: CreatePipelineStagePayload): Promise<PipelineStage> {
  const response = await apiClient.post<ApiSuccess<PipelineStage>>("/pipeline-stages", payload);
  pipelineStagesResource.invalidate();
  return response.data.data;
}

export async function updatePipelineStage(key: string, payload: UpdatePipelineStagePayload): Promise<PipelineStage> {
  const response = await apiClient.patch<ApiSuccess<PipelineStage>>(`/pipeline-stages/${key}`, payload);
  pipelineStagesResource.invalidate();
  return response.data.data;
}

export async function reorderPipelineStages(orderedKeys: string[]): Promise<PipelineStage[]> {
  const response = await apiClient.patch<ApiSuccess<PipelineStage[]>>("/pipeline-stages/reorder", { orderedKeys });
  pipelineStagesResource.invalidate();
  return response.data.data;
}
