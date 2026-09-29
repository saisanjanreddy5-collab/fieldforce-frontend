export interface PipelineStage {
  id: string;
  key: string;
  label: string;
  description: string | null;
  probability: number;
  isActive: boolean;
  sortOrder: number;
}

export interface CreatePipelineStagePayload {
  key: string;
  label: string;
  description?: string;
  probability: number;
}

export interface UpdatePipelineStagePayload {
  label?: string;
  description?: string | null;
  probability?: number;
  isActive?: boolean;
}
