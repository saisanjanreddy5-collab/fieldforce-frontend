export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: "admin" | "manager" | "agent";
  designation: string | null;
  managerId: string | null;
  smartfloAgentNumber: string | null;
  territory: string | null;
  salesTeamId: string | null;
  zoneId: string | null;
  employeeCode: string | null;
  dateOfJoining: string | null;
  status: "active" | "on_leave" | "onboarding";
  levelId: string | null;
  officeId: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface CreateUserPayload {
  name: string;
  email: string;
  password: string;
  role: "admin" | "manager" | "agent";
  designation?: string;
  managerId?: string;
  smartfloAgentNumber?: string;
  territory?: string;
  salesTeamId?: string;
  zoneId?: string;
  employeeCode?: string;
  dateOfJoining?: string;
  status?: "active" | "on_leave" | "onboarding";
  levelId?: string;
  officeId?: string;
}

export interface UpdateUserPayload {
  designation?: string;
  managerId?: string;
  smartfloAgentNumber?: string;
  territory?: string;
  salesTeamId?: string;
  zoneId?: string;
  employeeCode?: string;
  dateOfJoining?: string;
  status?: "active" | "on_leave" | "onboarding";
  levelId?: string;
  officeId?: string;
}
