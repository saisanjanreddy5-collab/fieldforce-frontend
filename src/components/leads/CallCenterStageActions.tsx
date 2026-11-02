import { useState } from "react";
import { App, Button, DatePicker, Input, Popover, Select, Typography } from "antd";
import { PhoneOutlined } from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";
import * as leadApi from "../../api/lead-api";
import { CALL_DISPOSITIONS, type CallDisposition } from "../../api/lead-api";
import type { Lead } from "../../types/lead";
import { useHasPermission } from "../../hooks/use-permission";
import { errorMessageFrom } from "../../utils/api-error";
import { FLC_STAGE, NEW_STAGE, SLC_STAGE } from "../../utils/lead-constants";
import { NextStepSlot } from "./NextStepSlot";

// Which tier a lead escalates to next, and what to call it - null for SLC,
// since that tier's own "next step" is the existing Qualify action below,
// not an escalation to a third tier. 'New' isn't in here - its own step
// (start-flc) isn't an "escalation" in the same sense, it's the one-time
// move from a brand-new, not-yet-worked lead into the real FLC queue, so it
// gets its own button below instead of this label's "Escalate to X" phrasing.
const NEXT_TIER: Record<string, { label: string; action: (id: string) => Promise<Lead> } | undefined> = {
  [FLC_STAGE]: { label: "SLC", action: leadApi.escalateToSlc },
};

const { Text } = Typography;

interface CallCenterStageActionsProps {
  lead: Lead;
  onChanged: () => void;
  // "nextStep" - the ONE primary button that moves this lead to its next
  // stage (FLC / Escalate to SLC / Mark Qualified). Rendered by LeadDetail
  // right next to the stage tag in LeadSnapshot's header, with a connecting
  // arrow, so cause (current stage) and effect (what clicking it does) sit
  // together instead of scattered across the header. "secondary" - Log call
  // outcome and the last-call-outcome summary text, rendered in the header's
  // secondary action cluster alongside Reassign/Pick up this lead, since
  // logging a call doesn't move the pipeline forward on its own.
  variant: "nextStep" | "secondary";
}

// Each button checks its own permission (leads.call_log / leads.escalate /
// leads.qualify) rather than one gate for all three - the Permissions screen
// lets an admin grant/revoke them independently per employee, so showing a
// button whose own permission was revoked would just produce a 403 on click
// instead of the button simply not being there.
export function CallCenterStageActions({ lead, onChanged, variant }: CallCenterStageActionsProps) {
  const { message } = App.useApp();
  const hasPermission = useHasPermission();
  const canLogCalls = hasPermission("leads.call_log");
  const canEscalate = hasPermission("leads.escalate");
  const canQualify = hasPermission("leads.qualify");
  const [dispositionOpen, setDispositionOpen] = useState(false);
  const [disposition, setDisposition] = useState<CallDisposition | undefined>(undefined);
  const [notes, setNotes] = useState("");
  const [callbackAt, setCallbackAt] = useState<Dayjs | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);
  const [qualifying, setQualifying] = useState(false);
  const [escalating, setEscalating] = useState(false);
  const [startingFlc, setStartingFlc] = useState(false);

  const nextTier = NEXT_TIER[lead.status];
  const isSlc = lead.status === SLC_STAGE;
  const isNew = lead.status === NEW_STAGE;

  // Once a lead escalates (or is sent to Field), the tier/team it came from
  // keeps a read-only lead_shares grant on it (shareLeadBackToSender) - so a
  // prior owner can still open and see this same lead sitting at its new
  // stage. Without this check, the buttons below would show to that
  // read-only viewer too, since they only look at the lead's own status, not
  // who's allowed to act on it - a 403-after-the-click instead of the button
  // simply not being there, same class of bug already fixed for
  // Call/Email/WhatsApp after a Field Sales handoff.
  if (!lead.inOwnerScope) return null;

  const isCallBack = disposition === "Call Back";

  const openDisposition = (open: boolean) => {
    setDispositionOpen(open);
    if (open) {
      setDisposition(undefined);
      setNotes("");
      setCallbackAt(undefined);
    }
  };

  const submitDisposition = async () => {
    if (!disposition) return;
    if (isCallBack && !callbackAt) return;
    setSubmitting(true);
    try {
      await leadApi.logCallDisposition(lead.id, {
        disposition,
        notes: notes.trim() || undefined,
        callbackAt: isCallBack ? callbackAt!.toISOString() : undefined,
      });
      message.success(isCallBack ? `Call logged - callback scheduled for ${callbackAt!.format("D MMM, h:mm A")}` : "Call logged");
      setDispositionOpen(false);
      onChanged();
    } catch (err) {
      message.error(errorMessageFrom(err, "Failed to log this call"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleQualify = async () => {
    setQualifying(true);
    try {
      await leadApi.qualifyLead(lead.id);
      message.success("Marked Qualified - ready to send to Field Sales");
      onChanged();
    } catch (err) {
      message.error(errorMessageFrom(err, "Failed to mark this lead Qualified"));
    } finally {
      setQualifying(false);
    }
  };

  const handleStartFlc = async () => {
    setStartingFlc(true);
    try {
      await leadApi.startFlc(lead.id);
      message.success("Moved to FLC");
      onChanged();
    } catch (err) {
      message.error(errorMessageFrom(err, "Failed to move this lead to FLC"));
    } finally {
      setStartingFlc(false);
    }
  };

  const handleEscalate = async () => {
    if (!nextTier) return;
    setEscalating(true);
    try {
      await nextTier.action(lead.id);
      message.success(`Escalated to ${nextTier.label}`);
      onChanged();
    } catch (err) {
      message.error(errorMessageFrom(err, `Failed to escalate to ${nextTier.label}`));
    } finally {
      setEscalating(false);
    }
  };

  if (variant === "nextStep") {
    if (canLogCalls && isNew) {
      return (
        <NextStepSlot>
          <Button size="small" type="primary" loading={startingFlc} onClick={handleStartFlc}>
            Push to FLC
          </Button>
        </NextStepSlot>
      );
    }
    if (canEscalate && nextTier) {
      return (
        <NextStepSlot>
          <Button size="small" type="primary" loading={escalating} onClick={handleEscalate}>
            Escalate to {nextTier.label}
          </Button>
        </NextStepSlot>
      );
    }
    if (canQualify && isSlc) {
      return (
        <NextStepSlot>
          <Button size="small" type="primary" loading={qualifying} onClick={handleQualify}>
            Mark Qualified
          </Button>
        </NextStepSlot>
      );
    }
    return null;
  }

  // variant === "secondary" - nothing to log for a lead that hasn't even
  // started FLC yet (it's never been called).
  if (!canLogCalls || isNew) return null;

  const dispositionContent = (
    <div style={{ width: 280, display: "flex", flexDirection: "column", gap: 8 }}>
      <Select
        size="small"
        placeholder="What happened on this call?"
        value={disposition}
        onChange={(value) => {
          setDisposition(value);
          if (value !== "Call Back") setCallbackAt(undefined);
        }}
        options={CALL_DISPOSITIONS.map((d) => ({ value: d, label: d }))}
      />
      {isCallBack && (
        <div>
          <DatePicker
            size="small"
            showTime
            style={{ width: "100%" }}
            placeholder="Call back on..."
            value={callbackAt}
            onChange={(value) => setCallbackAt(value ?? undefined)}
            disabledDate={(d) => d.isBefore(dayjs(), "day")}
            status={!callbackAt ? "error" : undefined}
          />
          {!callbackAt && (
            <Text type="danger" style={{ fontSize: 11, display: "block", marginTop: 2 }}>
              Pick when to call back
            </Text>
          )}
        </div>
      )}
      <Input.TextArea
        placeholder="Notes (optional) - e.g. asked to call back next week"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={2}
      />
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <Button size="small" onClick={() => setDispositionOpen(false)}>
          Cancel
        </Button>
        <Button
          size="small"
          type="primary"
          loading={submitting}
          disabled={!disposition || (isCallBack && !callbackAt)}
          onClick={submitDisposition}
        >
          Save
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {lead.lastCallOutcome && (
        <Text type="secondary" style={{ fontSize: 12 }}>
          Last: {lead.lastCallOutcome} ({lead.callAttemptCount} call{lead.callAttemptCount === 1 ? "" : "s"})
        </Text>
      )}
      <Popover content={dispositionContent} open={dispositionOpen} onOpenChange={openDisposition} trigger="click" placement="bottomRight">
        <Button size="small" icon={<PhoneOutlined />}>
          Log call outcome
        </Button>
      </Popover>
    </>
  );
}
