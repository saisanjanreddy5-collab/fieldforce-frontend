import { apiClient } from "./api-client";
import type { ApiSuccess } from "../types/api";
import type { MicrosoftConnectionStatus } from "../types/microsoft";

export async function getStatus(): Promise<MicrosoftConnectionStatus> {
  const response = await apiClient.get<ApiSuccess<MicrosoftConnectionStatus>>("/integrations/microsoft/status");
  return response.data.data;
}

// returnTo is the page to land back on once Microsoft's OAuth round-trip
// completes - without it, the backend has no way to know which module the
// person was in when they clicked Connect.
export async function getConnectUrl(returnTo: string): Promise<string> {
  const response = await apiClient.get<ApiSuccess<{ authUrl: string }>>("/integrations/microsoft/connect", {
    params: { returnTo },
  });
  return response.data.data.authUrl;
}

export async function disconnect(): Promise<void> {
  await apiClient.delete("/integrations/microsoft/disconnect");
}

export async function sendLeadEmail(leadId: string, subject: string, body: string, attachments: File[] = []): Promise<void> {
  const formData = new FormData();
  formData.append("subject", subject);
  formData.append("body", body);
  attachments.forEach((file) => formData.append("attachments", file));
  await apiClient.post(`/leads/${leadId}/microsoft/email`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
}

export interface UserMicrosoftConnection {
  id: string;
  name: string;
  designation: string | null;
  connected: boolean;
  email: string | null;
}

export async function listUsersStatus(): Promise<UserMicrosoftConnection[]> {
  const response = await apiClient.get<ApiSuccess<UserMicrosoftConnection[]>>("/integrations/microsoft/users");
  return response.data.data;
}

export async function disconnectUser(userId: string): Promise<void> {
  await apiClient.delete(`/integrations/microsoft/users/${userId}`);
}

export async function createTeamsMeeting(
  leadId: string,
  subject: string,
  startTime: string,
  endTime: string
): Promise<{ joinUrl: string }> {
  const response = await apiClient.post<ApiSuccess<{ joinUrl: string }>>(`/leads/${leadId}/microsoft/teams-meeting`, {
    subject,
    startTime,
    endTime,
  });
  return response.data.data;
}
