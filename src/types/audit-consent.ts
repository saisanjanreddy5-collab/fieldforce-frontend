export interface AuditEvent {
  id: string;
  entityType: string;
  entityId: string;
  entityLabel: string | null;
  action: string;
  summary: string;
  oldValue: string | null;
  newValue: string | null;
  actorName: string | null;
  ipAddress: string | null;
  createdAt: string;
}

export type ConsentBucketStatus = "granted" | "pending" | "mixed" | "no_data";

export interface ConsentBucket {
  key: string;
  label: string;
  granted: number;
  pending: number;
  total: number;
  status: ConsentBucketStatus;
}

export interface ConsentRecord {
  id: string;
  leadId: string;
  leadName: string;
  leadNumber: number | null;
  purposeBucket: string;
  purposesRaw: string | null;
  method: string | null;
  captured: boolean;
  status: string;
  capturedAt: string | null;
  createdAt: string;
}
