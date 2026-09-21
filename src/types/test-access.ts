export interface TestAccessSummary {
  id: string;
  name: string;
  territory: string | null;
  managerName: string | null;
  levelName: string | null;
  approvesUpTo: string | number | null;
  directReports: { id: string; name: string }[];
  ownLeadCount: number;
  teamPeopleBelow: number;
  teamLeadCountBelow: number;
  peers: { id: string; name: string }[];
}
