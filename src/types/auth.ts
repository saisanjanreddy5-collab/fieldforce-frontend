export type Role = "admin" | "manager" | "agent" | "call_center";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  designation: string | null;
  managerId: string | null;
  managerName: string | null;
  // A Call Center Executive can now be staffed on more than one team at
  // once - always an array, 0/1/2 entries.
  salesTeamNames: string[];
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
