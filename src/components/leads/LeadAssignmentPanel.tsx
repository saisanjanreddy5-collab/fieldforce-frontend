import { useState } from "react";
import { App, Button, Popover, Select, Skeleton, Typography } from "antd";
import { UserAddOutlined, UserSwitchOutlined } from "@ant-design/icons";
import * as leadApi from "../../api/lead-api";
import type { Lead } from "../../types/lead";
import { useAuth } from "../../context/AuthContext";
import { useHasPermission } from "../../hooks/use-permission";
import { errorMessageFrom } from "../../utils/api-error";
import { SendToFieldAction } from "./SendToFieldAction";
import { NextStepSlot } from "./NextStepSlot";
import { FLC_STAGE, NEW_STAGE, SLC_STAGE } from "../../utils/lead-constants";

const CALLING_TIER_STAGES: Record<string, true> = { [NEW_STAGE]: true, [FLC_STAGE]: true, [SLC_STAGE]: true };

const { Text } = Typography;

interface LeadAssignmentPanelProps {
  lead: Lead;
  onChanged: () => void;
  // "nextStep" - Send to Field Sales, the one primary action once a lead is
  // Qualified, rendered next to the stage tag like every other stage's
  // progression button (see CallCenterStageActions). "secondary" -
  // Reassign/Pick up this lead: handing a lead to someone else, never a
  // "move the pipeline forward" action on its own.
  variant: "nextStep" | "secondary";
}

// Admin/Manager-only assignment controls (Send to Field Sales, Reassign/
// Swap), plus the Call Center role's own self-service Pick up this lead - a
// separate panel rather than folded into LeadSnapshot, which stays purely
// presentational by design (see its own file header comment). Nothing here
// renders at all for anyone without at least one of the gating permissions.
//
// Reassign opens in a small anchored popover, deliberately never growing
// inline and pushing the rest of the page down, which is what the previous
// always-expanding-inline-block version did.
export function LeadAssignmentPanel({ lead, onChanged, variant }: LeadAssignmentPanelProps) {
  const { message } = App.useApp();
  const { user } = useAuth();
  const hasPermission = useHasPermission();
  const canSendToField = hasPermission("leads.send_to_field");
  const canReassign = hasPermission("leads.reassign");
  // Self-service pickup, narrower than Reassign above (which hands a lead to
  // ANY eligible person and stays Admin/Manager only) - any Call Center
  // Executive who can already see this lead (New/FLC/SLC, per
  // TIER_TEAMMATE_CLAUSE) can claim it as their own, covering a colleague's
  // leads on a day they're out, without needing the broader Reassign
  // permission. Gated by role here same as the backend route (requireRole,
  // not a new permission row).
  const canClaim = user?.role === "call_center" && CALLING_TIER_STAGES[lead.status] && lead.inOwnerScope && lead.ownerId !== user.id;

  const [reassignOpen, setReassignOpen] = useState(false);
  const [candidates, setCandidates] = useState<leadApi.SwapCandidate[] | null>(null);
  const [candidatesLoading, setCandidatesLoading] = useState(false);
  const [chosenId, setChosenId] = useState<string | undefined>(undefined);
  const [reassigning, setReassigning] = useState(false);
  const [claiming, setClaiming] = useState(false);

  if (variant === "nextStep") {
    if (canSendToField && lead.status === "Qualified" && lead.ownerRole !== "agent" && lead.inOwnerScope) {
      return (
        <NextStepSlot>
          <SendToFieldAction leadId={lead.id} size="small" onDone={onChanged} />
        </NextStepSlot>
      );
    }
    return null;
  }

  // variant === "secondary"
  if (!canReassign && !canClaim) return null;

  const handleClaim = async () => {
    setClaiming(true);
    try {
      await leadApi.claimLead(lead.id);
      message.success("Lead picked up");
      onChanged();
    } catch (err) {
      message.error(errorMessageFrom(err, "Failed to pick up this lead"));
    } finally {
      setClaiming(false);
    }
  };

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
      {canClaim && (
        <Button size="small" icon={<UserAddOutlined />} loading={claiming} onClick={handleClaim}>
          Pick up this lead
        </Button>
      )}
    </div>
  );
}
