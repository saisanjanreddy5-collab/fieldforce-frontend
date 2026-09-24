export type Role = "admin" | "manager" | "agent";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  designation: string | null;
  managerId: string | null;
  managerName: string | null;
  salesTeamId: string | null;
  salesTeamName: string | null;
  zoneId: string | null;
  stateId: string | null;
  districtId: string | null;
  areaId: string | null;
  smartfloAgentNumber: string | null;
  mobile: string | null;
  territory: string | null;
  isActive: boolean;
  permissions: string[];
}

export interface LoginResponse {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
}
