import type { Activity, ActivityComment } from "./activity";
import type { AuditEvent } from "./audit-consent";

// One entry in a lead's merged History tab - a discriminated union over the
// three real sources that make up "everything that ever happened on this
// lead": a communication (activity), a remark someone left on one
// (comment), or a real owner/status/category change (audit). Only the field
// matching `kind` is ever non-null - mirrors getLeadTimeline on the backend.
export interface LeadTimelineEntry {
  kind: "activity" | "comment" | "audit";
  id: string;
  date: string;
  activity: Activity | null;
  comment: (ActivityComment & { activityType: string; activitySubject: string | null }) | null;
  event: AuditEvent | null;
}
