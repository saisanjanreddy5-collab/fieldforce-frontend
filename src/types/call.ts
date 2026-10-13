export interface Call {
  id: string;
  leadId: string | null;
  leadFullName: string | null;
  leadPhone: string | null;
  customerId: string | null;
  referenceLabel: string | null;
  category: string | null;
  assignedTo: string | null;
  assignedToName: string | null;
  subject: string | null;
  status: string;
  dueDate: string | null;
  outcome: string | null;
  recordingUrl: string | null;
  durationSeconds: number | null;
  createdAt: string;
  updatedAt: string;
}
