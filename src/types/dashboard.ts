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
