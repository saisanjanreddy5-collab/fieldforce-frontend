import { apiClient } from "./api-client";
import type { ApiSuccess } from "../types/api";
import type { CalendarTeamMember, CalendarView } from "../types/calendar";

export async function getCalendarTeam(): Promise<CalendarTeamMember[]> {
  const response = await apiClient.get<ApiSuccess<CalendarTeamMember[]>>("/activities/calendar/team");
  return response.data.data;
}

export async function getCalendarView(userId: string | undefined, from: string, to: string): Promise<CalendarView> {
  const response = await apiClient.get<ApiSuccess<CalendarView>>("/activities/calendar", {
    params: { userId, from, to },
  });
  return response.data.data;
}
