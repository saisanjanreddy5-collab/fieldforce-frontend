export interface SearchLeadResult {
  id: string;
  fullName: string;
  companyName: string | null;
  phone: string | null;
  email: string | null;
  category: string | null;
  status: string;
}

export interface SearchOpportunityResult {
  id: string;
  name: string;
  leadFullName: string;
  stage: string;
  value: number | null;
}

export interface GlobalSearchResult {
  leads: SearchLeadResult[];
  opportunities: SearchOpportunityResult[];
}
