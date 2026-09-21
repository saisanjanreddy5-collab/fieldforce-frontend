export interface Opportunity {
  id: string;
  leadId: string;
  name: string | null;
  value: number | null;
  stage: string;
  closeDate: string | null;
  probability: number | null;
  contactName: string | null;
  notes: string | null;
  /** Set automatically the moment stage transitions into 'won' - not user-editable. */
  wonAt: string | null;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
  /** Only present on list responses (joined from the lead). */
  leadFullName?: string;
  leadCategory?: string | null;
  leadStoreCity?: string | null;
  leadStoreState?: string | null;
  leadZoneId?: string | null;
  leadTerritory?: string | null;
  leadSalesTeamId?: string | null;
  ownerId?: string | null;
  ownerName?: string | null;
}

export interface ListOpportunitiesFilters {
  stage?: string;
  category?: string;
  ownerId?: string;
  zoneId?: string;
  territory?: string;
  salesTeamId?: string;
  search?: string;
}

export interface CreateOpportunityPayload {
  name?: string;
  value?: number;
  stage?: string;
  closeDate?: string;
  probability?: number;
  contactName?: string;
  notes?: string;
}
