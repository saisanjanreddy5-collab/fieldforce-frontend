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
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
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
