export interface ExportLeadRow {
  id: string;
  leadNumber: number;
  fullName: string;
  phone: string | null;
  email: string | null;
  companyName: string | null;
  category: string | null;
  status: string;
  source: string | null;
  territory: string | null;
  expectedValue: number | null;
  ownerId: string | null;
  ownerName: string | null;
  ownerRole: string | null;
  ownerTeamName: string | null;
  createdAt: string;
  updatedAt: string;
  flcHandledBy: string;
  slcHandledBy: string;
  fieldSalesExecutive: string;
  internalNotes: string | null;
  rmRemark: string | null;
  lgRemark: string | null;
}

export interface ExportHistoryRow {
  leadNumber: number;
  leadName: string;
  date: string;
  kind: "Activity" | "Remark" | "History";
  detail: string;
  actor: string;
}

export interface LeadsExportResult {
  leads: ExportLeadRow[];
  history: ExportHistoryRow[];
}
