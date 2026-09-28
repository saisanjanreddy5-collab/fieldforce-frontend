import type { Activity } from "./activity";

export interface CalendarTeamMember {
  id: string;
  name: string;
}

export type CalendarDayTag = "field" | "office" | "off";

export interface CalendarStats {
  scheduledThisWeek: number;
  todayTotal: number;
  todayDone: number;
  overdueCount: number;
  fieldDaysThisWeek: number;
}

export interface CalendarView {
  user: { id: string; name: string; zoneName: string | null; officeName: string | null };
  msSyncedAt: string | null;
  activities: Activity[];
  stats: CalendarStats;
  dayTags: Record<string, CalendarDayTag>;
}
