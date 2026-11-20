import { pipelineStagesResource } from "../api/pipeline-stage-api";
import type { PipelineStage } from "../types/pipeline-stage";
import { useCachedResource } from "../utils/cached-resource";

const NONE: PipelineStage[] = [];

// The admin-editable pipeline_stages list, fetched once and shared by every
// screen (see utils/cached-resource.ts). enabled: false waits until needed.
export function usePipelineStages(enabled = true) {
  const { data, loading } = useCachedResource(pipelineStagesResource, enabled);
  return { stages: data ?? NONE, loading };
}
