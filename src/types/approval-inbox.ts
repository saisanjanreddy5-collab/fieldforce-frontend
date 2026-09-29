export type ApprovalItemType = "onboarding_push" | "leave" | "expense";

export interface ApprovalQueueItem {
  id: string;
  type: ApprovalItemType;
  typeLabel: string;
  title: string;
  subtitle: string;
  value: number | null;
  valueLabel: string;
  raisedByName: string | null;
  createdAt: string;
  waitingHours: number;
  isSlaBreach: boolean;
  stepLabel: string;
  isPolicyBreach: boolean;
  refId: string;
  raw: unknown;
}

export interface ApprovalInboxStats {
  waitingOnYou: number;
  breachingSla: number;
  valueInQueue: number;
  valueInQueueCount: number;
  approvedThisWeek: number;
  avgDecisionHours: number | null;
}

export interface ApprovalInbox {
  items: ApprovalQueueItem[];
  stats: ApprovalInboxStats;
}
