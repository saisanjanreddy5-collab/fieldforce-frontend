export interface OverviewStats {
  totalLeads: number;
  totalOpportunities: number;
  pipelineValue: number;
  conversionRate30d: number;
  activeTeamMembersCount: number;
}

export interface PipelineStageStat {
  stage: string;
  count: number;
  totalValue: number;
}

export interface TeamPerformanceStat {
  userId: string;
  name: string;
  leadsOwned: number;
  opportunitiesOwned: number;
  activitiesLogged: number;
  leadsConverted: number;
  conversionRate: number;
}
