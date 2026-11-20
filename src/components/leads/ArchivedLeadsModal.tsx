import * as leadApi from "../../api/lead-api";
import type { Lead } from "../../types/lead";
import { errorMessageFrom } from "../../utils/api-error";
import { ArchivedRecordsModal } from "../ArchivedRecordsModal";

interface ArchivedLeadsModalProps {
  open: boolean;
  onClose: () => void;
  onRestored: () => void;
}

export function ArchivedLeadsModal({ open, onClose, onRestored }: ArchivedLeadsModalProps) {
  return (
    <ArchivedRecordsModal<Lead>
      open={open}
      onClose={onClose}
      onRestored={onRestored}
      title="Archived leads"
      noun="lead"
      searchPlaceholder="Search archived leads by name, company, or phone"
      emptyText="No archived leads"
      loadErrorText="Failed to load archived leads"
      paginationKey="archived-leads"
      fetchPage={({ search, page, limit }) =>
        leadApi.listLeads({ archived: true, search, page, limit }).then((r) => ({ items: r.leads, total: r.total }))
      }
      restore={(lead) => leadApi.restoreLead(lead.id)}
      restoredText={(lead) => `${lead.fullName} restored`}
      restoreErrorText={(err) => errorMessageFrom(err, "Failed to restore this lead")}
      primaryText={(lead) => lead.fullName}
      secondaryText={(lead) => [lead.companyName, lead.phone].filter(Boolean).join(" · ") || "No contact details"}
    />
  );
}
