import { useState } from "react";
import { App, Button, Empty, Select, Skeleton, Typography } from "antd";
import { isAxiosError } from "axios";
import { SendOutlined, SwapOutlined, UserSwitchOutlined } from "@ant-design/icons";
import * as leadApi from "../../api/lead-api";
import type { Lead } from "../../types/lead";
import type { AuditEvent } from "../../types/audit-consent";
import { useHasPermission } from "../../hooks/use-permission";
import { errorMessageFrom } from "../../utils/api-error";
import { formatDateTime } from "../../utils/lead-format";
import { appTokens } from "../../utils/design-system";

const { Text, Title } = Typography;

interface LeadAssignmentPanelProps {
  lead: Lead;
  onChanged: () => void;
}

// Admin/Manager-only assignment controls (Send to Field Sales, Reassign/
// Swap) plus the lead's full change history - a separate panel rather than
// folded into LeadSnapshot, which stays purely presentational by design
// (see its own file header comment). Nothing here renders at all for
// anyone without at least one of the two gating permissions, same as every
// other permission-gated action in this app.
export function LeadAssignmentPanel({ lead, onChanged }: LeadAssignmentPanelProps) {
  const { message } = App.useApp();
  const hasPermission = useHasPermission();
  const canSendToField = hasPermission("leads.send_to_field");
  const canReassign = hasPermission("leads.reassign");

  const [sending, setSending] = useState(false);
  const [reassignOpen, setReassignOpen] = useState(false);
  const [candidates, setCandidates] = useState<leadApi.SwapCandidate[] | null>(null);
  const [candidatesLoading, setCandidatesLoading] = useState(false);
  const [chosenId, setChosenId] = useState<string | undefined>(undefined);
  const [reassigning, setReassigning] = useState(false);

  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<AuditEvent[] | null>(null);

  if (!canSendToField && !canReassign) return null;

  const loadCandidates = () => {
    setCandidatesLoading(true);
    leadApi
      .getSwapCandidates(lead.id)
      .then(setCandidates)
      .catch(() => message.error("Failed to load eligible employees"))
      .finally(() => setCandidatesLoading(false));
  };

  const openReassign = () => {
    setReassignOpen(true);
    setChosenId(undefined);
    loadCandidates();
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

  // Tries the obvious case first (exactly one field employee covers this
  // pincode) - the backend reports back the real candidate list the moment
  // there's more than one, rather than this guessing or picking the first
  // one itself.
  const handleSendToField = async () => {
    setSending(true);
    try {
      await leadApi.sendToField(lead.id);
      message.success("Sent to Field Sales");
      onChanged();
    } catch (err) {
      if (isAxiosError<{ errors?: { candidates?: leadApi.SwapCandidate[] } }>(err) && err.response?.data.errors?.candidates) {
        setCandidates(err.response.data.errors.candidates);
        setChosenId(undefined);
        setReassignOpen(true);
        message.info("More than one field employee covers this pincode - pick one below");
      } else {
        message.error(errorMessageFrom(err, "Failed to send this lead to Field Sales"));
      }
    } finally {
      setSending(false);
    }
  };

  const loadHistory = () => {
    if (history !== null) {
      setHistoryOpen((v) => !v);
      return;
    }
    leadApi
      .getLeadHistory(lead.id)
      .then((events) => {
        setHistory(events);
        setHistoryOpen(true);
      })
      .catch(() => message.error("Failed to load history"));
  };

  return (
    <div
      style={{
        marginTop: 12,
        border: `1px solid ${appTokens.border}`,
        borderRadius: appTokens.radius,
        background: appTokens.surface,
        boxShadow: appTokens.shadowXs,
        padding: 14,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
        <Text style={{ fontSize: 13 }}>
          <Text strong>Owner:</Text> {lead.ownerName ?? "Unassigned"}
        </Text>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {canSendToField && lead.status === "Qualified" && (
            <Button size="small" type="primary" icon={<SendOutlined />} loading={sending} onClick={handleSendToField}>
              Send to Field Sales
            </Button>
          )}
          {canReassign && (
            <Button size="small" icon={<UserSwitchOutlined />} onClick={openReassign}>
              Reassign
            </Button>
          )}
          <Button size="small" type="link" onClick={loadHistory}>
            {historyOpen ? "Hide history" : "History"}
          </Button>
        </div>
      </div>

      {reassignOpen && (
        <div
          style={{
            marginTop: 12,
            padding: 12,
            background: appTokens.surfaceMuted,
            borderRadius: appTokens.radiusSm,
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <Text type="secondary" style={{ fontSize: 12 }}>
            {lead.status === "Call Center"
              ? "Any active Call Center employee can take this lead."
              : "Only field employees who cover this lead's pincode are listed."}
          </Text>
          <Select
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
      )}

      {historyOpen && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${appTokens.borderLight}` }}>
          <Title level={5} style={{ margin: "0 0 10px", fontSize: 13 }}>
            History
          </Title>
          {history === null ? (
            <Skeleton active paragraph={{ rows: 2 }} />
          ) : history.length === 0 ? (
            <Empty description="No changes yet" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {history.map((event) => (
                <div key={event.id} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <div
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: "50%",
                      background: appTokens.surfaceMuted,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      fontSize: 11,
                      color: appTokens.textSecondary,
                    }}
                  >
                    <SwapOutlined />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <Text strong style={{ fontSize: 13 }}>
                      {event.summary}
                    </Text>
                    {(event.oldValue || event.newValue) && (
                      <div>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {event.oldValue ?? "-"} → {event.newValue ?? "-"}
                        </Text>
                      </div>
                    )}
                    <div>
                      <Text type="secondary" style={{ fontSize: 11.5 }}>
                        {formatDateTime(event.createdAt)}
                        {event.actorName ? ` · by ${event.actorName}` : ""}
                      </Text>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
