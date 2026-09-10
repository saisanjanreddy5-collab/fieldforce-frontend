export type Role = "admin" | "manager" | "agent";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  designation: string | null;
  managerId: string | null;
  salesTeamId: string | null;
  zoneId: string | null;
  stateId: string | null;
  districtId: string | null;
  areaId: string | null;
  isActive: boolean;
}

export interface LoginResponse {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
}
