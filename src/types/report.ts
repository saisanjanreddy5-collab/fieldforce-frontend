export interface SalespersonPerformanceRow {
  userId: string;
  name: string;
  leads: number;
  converted: number;
  conversionRate: number;
  revenue: number;
}

export interface StateWiseRow {
  stateId: string;
  stateName: string;
  leads: number;
  customers: number;
  fofoLive: number;
  openTickets: number | null;
}

export interface B2BGroupRow {
  category: string;
  accounts: number;
  revenue: number;
  avgOrder: number | null;
  overdue: number | null;
}

export interface LeadSourceRoiRow {
  source: string;
  leads: number;
  qualified: number;
  cost: number | null;
  cpql: number | null;
}

export interface FofoCohortRow {
  cohortMonth: string;
  stores: number;
  m3: number | null;
  m6: number | null;
  m12: number | null;
}

export interface SavedReportView {
  id: string;
  reportKey: string;
  name: string;
  filters: Record<string, unknown>;
  createdAt: string;
}
