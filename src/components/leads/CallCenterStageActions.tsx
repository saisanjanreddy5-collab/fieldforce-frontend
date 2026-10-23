import { useState } from "react";
import { App, Button, DatePicker, Input, Popover, Select, Typography } from "antd";
import { PhoneOutlined } from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";
import * as leadApi from "../../api/lead-api";
import { CALL_DISPOSITIONS, type CallDisposition } from "../../api/lead-api";
import type { Lead } from "../../types/lead";
import { useHasPermission } from "../../hooks/use-permission";
import { errorMessageFrom } from "../../utils/api-error";

const { Text } = Typography;

interface CallCenterStageActionsProps {
  lead: Lead;
  onChanged: () => void;
}

// Log call outcome / Mark Qualified - the two Call Center-only actions that
// only ever apply while a lead is still in the "Call Center" stage. Rendered
// in the same compact row as Send to Field Sales/Reassign/History (see
// LeadDetail.tsx), not a separate box, for the same space reason those got
// redesigned. Each button checks its own permission (leads.call_log /
// leads.qualify) rather than one gate for both - the Permissions screen
// lets an admin grant/revoke them independently per employee, so showing a
// button whose own permission was revoked would just produce a 403 on
// click instead of the button simply not being there.
export function CallCenterStageActions({ lead, onChanged }: CallCenterStageActionsProps) {
  const { message } = App.useApp();
  const hasPermission = useHasPermission();
  const canLogCalls = hasPermission("leads.call_log");
  const canQualify = hasPermission("leads.qualify");
  const [dispositionOpen, setDispositionOpen] = useState(false);
  const [disposition, setDisposition] = useState<CallDisposition | undefined>(undefined);
  const [notes, setNotes] = useState("");
  const [callbackAt, setCallbackAt] = useState<Dayjs | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);
  const [qualifying, setQualifying] = useState(false);

  if ((!canLogCalls && !canQualify) || lead.status !== "Call Center") return null;

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
      {canLogCalls && (
        <Popover content={dispositionContent} open={dispositionOpen} onOpenChange={openDisposition} trigger="click" placement="bottomRight">
          <Button size="small" icon={<PhoneOutlined />}>
            Log call outcome
          </Button>
        </Popover>
      )}
      {canQualify && (
        <Button size="small" type="primary" loading={qualifying} onClick={handleQualify}>
          Mark Qualified
        </Button>
      )}
    </>
  );
}
