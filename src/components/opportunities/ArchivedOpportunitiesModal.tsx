import * as opportunityApi from "../../api/opportunity-api";
import type { Opportunity } from "../../types/opportunity";
import { formatWholeCurrency } from "../../utils/lead-format";
import { ArchivedRecordsModal } from "../ArchivedRecordsModal";

interface ArchivedOpportunitiesModalProps {
  open: boolean;
  onClose: () => void;
  onRestored: () => void;
}

export function ArchivedOpportunitiesModal({ open, onClose, onRestored }: ArchivedOpportunitiesModalProps) {
  return (
    <ArchivedRecordsModal<Opportunity>
      open={open}
      onClose={onClose}
      onRestored={onRestored}
      title="Archived opportunities"
      noun="opportunity"
      searchPlaceholder="Search archived opportunities by name or lead"
      emptyText="No archived opportunities"
      loadErrorText="Failed to load archived opportunities"
      paginationKey="archived-opportunities"
      fetchPage={({ search, page, limit }) =>
        opportunityApi
          .listOpportunities({ archived: true, search, page, limit })
          .then((r) => ({ items: r.opportunities, total: r.total }))
      }
      restore={(opp) => opportunityApi.restoreOpportunity(opp.id)}
      restoredText={(opp) => `${opp.name ?? opp.leadFullName ?? "Opportunity"} restored`}
      restoreErrorText={() => "Failed to restore this opportunity"}
      primaryText={(opp) => opp.name ?? opp.leadFullName ?? "Untitled opportunity"}
      secondaryText={(opp) => [opp.leadFullName, opp.value ? formatWholeCurrency(opp.value) : null].filter(Boolean).join(" · ") || "No details"}
    />
  );
}
