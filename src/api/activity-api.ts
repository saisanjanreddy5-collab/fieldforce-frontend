import { apiClient } from "./api-client";
import type { ApiSuccess } from "../types/api";
import type { Activity, CreateActivityPayload } from "../types/activity";

export async function listActivitiesForLead(leadId: string): Promise<Activity[]> {
  const response = await apiClient.get<ApiSuccess<Activity[]>>(`/leads/${leadId}/activities`);
  return response.data.data;
}

export async function createActivityForLead(leadId: string, payload: CreateActivityPayload): Promise<Activity> {
  const response = await apiClient.post<ApiSuccess<Activity>>(`/leads/${leadId}/activities`, payload);
  return response.data.data;
}

export async function updateActivity(id: string, payload: Partial<CreateActivityPayload>): Promise<Activity> {
  const response = await apiClient.patch<ApiSuccess<Activity>>(`/activities/${id}`, payload);
  return response.data.data;
}
