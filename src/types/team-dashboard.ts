export type TeamDayTag = "field" | "office" | "leave" | "weekly_off" | "none";

export interface TeamDay {
  date: string;
  tag: TeamDayTag;
}

export interface TeamMemberAvailability {
  id: string;
  name: string;
  territory: string | null;
  days: TeamDay[];
  loadThisWeek: number;
}

export interface TeamDashboardStats {
  headcount: number;
  availableToday: number;
  onLeaveToday: number;
  onLeaveUnapprovedToday: number;
  fieldVisitsToday: number;
  fieldVisitsPendingToday: number;
  avgActivitiesPerPerson: number;
  avgActivitiesPerPersonLastWeek: number;
}

export interface TeamAvailability {
  team: TeamMemberAvailability[];
  weekStart: string;
  stats: TeamDashboardStats;
}
