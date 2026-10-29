import { useState } from "react";
import { App, Button, Popover, Select, Skeleton, Typography } from "antd";
import { UserSwitchOutlined } from "@ant-design/icons";
import * as leadApi from "../../api/lead-api";
import type { Lead } from "../../types/lead";
import { useHasPermission } from "../../hooks/use-permission";
import { errorMessageFrom } from "../../utils/api-error";
import { SendToFieldAction } from "./SendToFieldAction";
import { FLC_STAGE, SLC_STAGE } from "../../utils/lead-constants";

const CALLING_TIER_STAGES: Record<string, true> = { [FLC_STAGE]: true, [SLC_STAGE]: true };

const { Text } = Typography;

interface LeadAssignmentPanelProps {
  lead: Lead;
  onChanged: () => void;
  // Jumps the parent LeadDetail to its History tab - that tab is now the one
  // place the lead's full change history lives (see lead-service.ts's
  // getLeadTimeline), so this button no longer keeps its own separate copy
  // of that view in a drawer.
  onViewHistory: () => void;
}

// Admin/Manager-only assignment controls (Send to Field Sales, Reassign/
// Swap) - a separate panel rather than folded into LeadSnapshot, which stays
// purely presentational by design (see its own file header comment).
// Nothing here renders at all for anyone without at least one of the two
// gating permissions.
//
// Reassign opens in a small anchored popover, deliberately never growing
// inline and pushing the rest of the page down, which is what the previous
// always-expanding-inline-block version did.
export function LeadAssignmentPanel({ lead, onChanged, onViewHistory }: LeadAssignmentPanelProps) {
  const { message } = App.useApp();
  const hasPermission = useHasPermission();
  const canSendToField = hasPermission("leads.send_to_field");
  const canReassign = hasPermission("leads.reassign");

  const [reassignOpen, setReassignOpen] = useState(false);
  const [candidates, setCandidates] = useState<leadApi.SwapCandidate[] | null>(null);
  const [candidatesLoading, setCandidatesLoading] = useState(false);
  const [chosenId, setChosenId] = useState<string | undefined>(undefined);
  const [reassigning, setReassigning] = useState(false);

  if (!canSendToField && !canReassign) return null;

  const openReassign = (open: boolean) => {
    setReassignOpen(open);
    if (!open) return;
    setChosenId(undefined);
    setCandidatesLoading(true);
    leadApi
      .getSwapCandidates(lead.id)
      .then(setCandidates)
      .catch(() => message.error("Failed to load eligible employees"))
      .finally(() => setCandidatesLoading(false));
  };

  const submitReassign = async () => {
    if (!chosenId) return;
    setReassigning(true);
    try {
      await leadApi.reassignLead(lead.id, chosenId);
      message.success("Lead reassigned");
      setReassignOpen(false);
      onChanged();
    } catch (err) {
      message.error(errorMessageFrom(err, "Failed to reassign this lead"));
    } finally {
      setReassigning(false);
    }
  };

  const reassignContent = (
    <div style={{ width: 280, display: "flex", flexDirection: "column", gap: 8 }}>
      <Text type="secondary" style={{ fontSize: 12 }}>
        {CALLING_TIER_STAGES[lead.status]
          ? `Any active ${lead.status} team employee can take this lead.`
          : "Only field employees who cover this lead's pincode are listed."}
      </Text>
      <Select
        size="small"
        loading={candidatesLoading}
        placeholder="Choose a person"
        value={chosenId}
        onChange={setChosenId}
        notFoundContent={candidatesLoading ? <Skeleton.Input active size="small" /> : "No one eligible"}
        options={(candidates ?? []).map((c) => ({ value: c.id, label: `${c.name} (${c.email})` }))}
      />
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <Button size="small" onClick={() => setReassignOpen(false)}>
          Cancel
        </Button>
        <Button size="small" type="primary" loading={reassigning} disabled={!chosenId} onClick={submitReassign}>
          Confirm
        </Button>
      </div>
    </div>
  );

  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
      {canSendToField && lead.status === "Qualified" && lead.ownerRole !== "agent" && lead.inOwnerScope && (
        <SendToFieldAction leadId={lead.id} size="small" onDone={onChanged} />
      )}
      {canReassign && lead.inOwnerScope && (
        <Popover
          content={reassignContent}
          open={reassignOpen}
          onOpenChange={openReassign}
          trigger="click"
          placement="bottomRight"
        >
          <Button size="small" icon={<UserSwitchOutlined />}>
            Reassign
          </Button>
        </Popover>
      )}
      <Button size="small" type="link" onClick={onViewHistory} style={{ paddingLeft: 0, paddingRight: 0 }}>
        History
      </Button>
    </div>
  );
}
