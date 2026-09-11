export type ActivityType = "call" | "email" | "teams_meeting" | "site_visit";

export interface Activity {
  id: string;
  type: ActivityType;
  leadId: string | null;
  opportunityId: string | null;
  assignedTo: string | null;
  subject: string | null;
  dueDate: string | null;
  status: string;
  details: Record<string, unknown>;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ActivityComment {
  id: string;
  activityId: string;
  userId: string | null;
  comment: string;
  createdAt: string;
}

export interface CreateActivityPayload {
  type: ActivityType;
  subject?: string;
  dueDate?: string;
  status?: string;
  assignedTo?: string;
  details?: Record<string, unknown>;
}

