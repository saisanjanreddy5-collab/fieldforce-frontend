import { useEffect, useState } from "react";
import * as pipelineStageApi from "../api/pipeline-stage-api";
import type { PipelineStage } from "../types/pipeline-stage";

// Replaces the old hardcoded LEAD_STATUS_VALUES array - the lead form's
// Status field and the lead list's status filter now both read the real,
// admin-editable pipeline_stages table via this same hook.
export function usePipelineStages() {
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    pipelineStageApi
      .listPipelineStages()
      .then(setStages)
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  return { stages, loading };
}
