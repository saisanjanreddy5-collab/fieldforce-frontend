export interface SalesTeam {
  id: string;
  name: string;
  region: string | null;
  createdAt: string;
}

export interface CreateSalesTeamPayload {
  name: string;
  region?: string;
}

export interface Zone {
  id: string;
  name: string;
}
