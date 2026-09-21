export type UserStatus = "active" | "on_leave" | "onboarding" | "exited";

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: "admin" | "manager" | "agent";
  designation: string | null;
  managerId: string | null;
  dottedLineManagerId: string | null;
  smartfloAgentNumber: string | null;
  mobile: string | null;
  territory: string | null;
  salesTeamId: string | null;
  zoneId: string | null;
  stateId: string | null;
  employeeCode: string | null;
  dateOfJoining: string | null;
  status: UserStatus;
  levelId: string | null;
  officeId: string | null;
  divisionChannelId: string | null;
  customerCategoryId: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface CreateUserPayload {
  name: string;
  email: string;
  password: string;
  // Optional now that a Level determines the real security tier server
  // side (see auth-service.ts's registerUser) - only needed as a fallback
  // for an account with no Level (Administrator/Finance-style entries).
  role?: "admin" | "manager" | "agent";
  designation?: string;
  managerId?: string;
  dottedLineManagerId?: string;
  smartfloAgentNumber?: string;
  mobile?: string;
  territory?: string;
  salesTeamId?: string;
  zoneId?: string;
  stateId?: string;
  employeeCode?: string;
  dateOfJoining?: string;
  status?: UserStatus;
  levelId?: string;
  officeId?: string;
  divisionChannelId?: string;
  customerCategoryId?: string;
}

export interface UpdateUserPayload {
  designation?: string;
  managerId?: string;
  dottedLineManagerId?: string;
  smartfloAgentNumber?: string;
  mobile?: string;
  territory?: string;
  salesTeamId?: string;
  zoneId?: string;
  stateId?: string;
  employeeCode?: string;
  dateOfJoining?: string;
  status?: UserStatus;
  levelId?: string;
  officeId?: string;
  divisionChannelId?: string;
  customerCategoryId?: string;
}
