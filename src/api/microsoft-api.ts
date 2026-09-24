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

export async function sendLeadEmail(leadId: string, subject: string, body: string): Promise<void> {
  await apiClient.post(`/leads/${leadId}/microsoft/email`, { subject, body });
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
