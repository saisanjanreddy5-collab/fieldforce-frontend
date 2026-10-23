import { useState } from "react";
import { App, Button, Drawer, Empty, Popover, Select, Skeleton, Typography } from "antd";
import { SwapOutlined, UserSwitchOutlined } from "@ant-design/icons";
import * as leadApi from "../../api/lead-api";
import type { Lead } from "../../types/lead";
import type { AuditEvent } from "../../types/audit-consent";
import { useHasPermission } from "../../hooks/use-permission";
import { errorMessageFrom } from "../../utils/api-error";
import { formatDateTime } from "../../utils/lead-format";
import { appTokens } from "../../utils/design-system";
import { SendToFieldAction } from "./SendToFieldAction";

const { Text } = Typography;

interface LeadAssignmentPanelProps {
  lead: Lead;
  onChanged: () => void;
}

// Admin/Manager-only assignment controls (Send to Field Sales, Reassign/
// Swap) plus the lead's full change history - a separate panel rather than
// folded into LeadSnapshot, which stays purely presentational by design
// (see its own file header comment). Nothing here renders at all for
// anyone without at least one of the two gating permissions.
//
// Reassign opens in a small anchored popover and History slides in as a
// drawer - both deliberately never grow inline and push the rest of the
// page down, which is what the previous always-expanding-inline-block
// version did.
export function LeadAssignmentPanel({ lead, onChanged }: LeadAssignmentPanelProps) {
  const { message } = App.useApp();
  const hasPermission = useHasPermission();
  const canSendToField = hasPermission("leads.send_to_field");
  const canReassign = hasPermission("leads.reassign");

  const [reassignOpen, setReassignOpen] = useState(false);
  const [candidates, setCandidates] = useState<leadApi.SwapCandidate[] | null>(null);
  const [candidatesLoading, setCandidatesLoading] = useState(false);
  const [chosenId, setChosenId] = useState<string | undefined>(undefined);
  const [reassigning, setReassigning] = useState(false);

  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<AuditEvent[] | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);

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

  const openHistory = () => {
    setHistoryOpen(true);
    if (history !== null) return;
    setHistoryLoading(true);
    leadApi
      .getLeadHistory(lead.id)
      .then(setHistory)
      .catch(() => message.error("Failed to load history"))
      .finally(() => setHistoryLoading(false));
  };

  const reassignContent = (
    <div style={{ width: 280, display: "flex", flexDirection: "column", gap: 8 }}>
      <Text type="secondary" style={{ fontSize: 12 }}>
        {lead.status === "Call Center"
          ? "Any active Call Center employee can take this lead."
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
    <>
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
        <Button size="small" type="link" onClick={openHistory} style={{ paddingLeft: 0, paddingRight: 0 }}>
          History
        </Button>
      </div>

      <Drawer title={`History - ${lead.fullName}`} open={historyOpen} onClose={() => setHistoryOpen(false)} size="default">
        {historyLoading || history === null ? (
          <Skeleton active paragraph={{ rows: 3 }} />
        ) : history.length === 0 ? (
          <Empty description="No changes yet" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {history.map((event) => (
              <div key={event.id} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <div
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: "50%",
                    background: appTokens.surfaceMuted,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    fontSize: 12,
                    color: appTokens.textSecondary,
                  }}
                >
                  <SwapOutlined />
                </div>
                <div style={{ minWidth: 0 }}>
                  <Text strong style={{ fontSize: 13.5 }}>
                    {event.summary}
                  </Text>
                  {(event.oldValue || event.newValue) && (
                    <div>
                      <Text type="secondary" style={{ fontSize: 12.5 }}>
                        {event.oldValue ?? "-"} → {event.newValue ?? "-"}
                      </Text>
                    </div>
                  )}
                  <div>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {formatDateTime(event.createdAt)}
                      {event.actorName ? ` · by ${event.actorName}` : ""}
                    </Text>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Drawer>
    </>
  );
}
