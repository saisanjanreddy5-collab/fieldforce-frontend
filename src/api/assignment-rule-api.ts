import { apiClient } from "./api-client";
import type { ApiSuccess } from "../types/api";
import type { AssignmentRule, CreateAssignmentRulePayload, UpdateAssignmentRulePayload } from "../types/assignment-rule";

export async function listAssignmentRules(): Promise<AssignmentRule[]> {
  const response = await apiClient.get<ApiSuccess<{ assignmentRules: AssignmentRule[]; total: number }>>("/assignment-rules", {
    params: { limit: 200 },
  });
  return response.data.data.assignmentRules;
}

export async function createAssignmentRule(payload: CreateAssignmentRulePayload): Promise<AssignmentRule> {
  const response = await apiClient.post<ApiSuccess<AssignmentRule>>("/assignment-rules", payload);
  return response.data.data;
}

export async function updateAssignmentRule(id: string, payload: UpdateAssignmentRulePayload): Promise<AssignmentRule> {
  const response = await apiClient.patch<ApiSuccess<AssignmentRule>>(`/assignment-rules/${id}`, payload);
  return response.data.data;
}
