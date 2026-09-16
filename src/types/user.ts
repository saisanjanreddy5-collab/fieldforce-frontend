export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: "admin" | "manager" | "agent";
  designation: string | null;
  managerId: string | null;
  smartfloAgentNumber: string | null;
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
}
