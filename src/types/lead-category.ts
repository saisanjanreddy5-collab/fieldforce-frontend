export interface LeadCategory {
  id: string;
  key: string;
  label: string;
  description: string | null;
  isActive: boolean;
  sortOrder: number;
}

export interface CreateLeadCategoryPayload {
  key: string;
  label: string;
  description?: string;
}

export interface UpdateLeadCategoryPayload {
  label?: string;
  description?: string | null;
  isActive?: boolean;
}
