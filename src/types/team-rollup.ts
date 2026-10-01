export interface TeamRollupQuota {
  targetAmount: number;
  achievedAmount: number;
  attainmentPercent: number;
}

export interface TeamRollupPerson {
  id: string;
  name: string;
  role: string;
  designation: string | null;
  territory: string | null;
  openDeals: number;
  pipeline: number;
  wonMtd: number;
  /** null when this person has no monthly target configured yet - never shown as a fabricated 0%. */
  quota: TeamRollupQuota | null;
}

export interface TeamRollupGroup {
  managerId: string;
  managerName: string;
  teamName: string | null;
  region: string | null;
  territories: string[];
  openDeals: number;
  pipeline: number;
  weighted: number;
  wonMtd: number;
  people: TeamRollupPerson[];
}
