import { useEffect, useMemo, useState } from "react";
import { Button, Input, Spin, Tag, Tooltip, Typography, message } from "antd";
import { CheckCircleFilled, ClockCircleOutlined, WarningOutlined } from "@ant-design/icons";
import * as approvalsInboxApi from "../api/approvals-inbox-api";
import * as fofoApi from "../api/fofo-onboarding-api";
import * as leaveApi from "../api/leave-api";
import * as expenseApi from "../api/expense-api";
import type { ApprovalItemType, ApprovalInbox, ApprovalQueueItem } from "../types/approval-inbox";
import type { LeaveRequest } from "../types/leave";
import type { ExpenseClaim } from "../types/expense";
import type { FofoHandoff } from "../types/fofo-onboarding";
import { errorMessageFrom } from "../utils/api-error";
import { appTokens } from "../utils/design-system";

const { Text, Title } = Typography;
const { TextArea } = Input;

const TYPE_FILTERS: { key: ApprovalItemType | "all"; label: string }[] = [
  { key: "all", label: "All pending" },
  { key: "onboarding_push", label: "Onboarding push" },
  { key: "leave", label: "Leave" },
  { key: "expense", label: "Expense" },
];

function StatCard({ label, value, sub, labelHint }: { label: string; value: string; sub?: string; labelHint?: string }) {
  return (
    <div
      style={{
        flex: 1,
        minWidth: 150,
        border: `1px solid ${appTokens.border}`,
        borderRadius: appTokens.radius,
        background: appTokens.surface,
        boxShadow: appTokens.shadowSm,
        padding: "14px 16px",
      }}
    >
      {labelHint ? (
        <Tooltip title={labelHint}>
          <Text style={{ fontSize: 11.5, color: appTokens.textTertiary, cursor: "help", borderBottom: `1px dashed ${appTokens.textTertiary}` }}>{label}</Text>
        </Tooltip>
      ) : (
        <Text style={{ fontSize: 11.5, color: appTokens.textTertiary }}>{label}</Text>
      )}
      <div style={{ fontSize: 22, fontWeight: 700, color: appTokens.textPrimary, lineHeight: 1.3 }}>{value}</div>
      {sub && <Text style={{ fontSize: 11.5, color: appTokens.textTertiary }}>{sub}</Text>}
    </div>
  );
}

function formatWaiting(hours: number): string {
  if (hours < 1) return "just now";
  if (hours < 24) return `${Math.round(hours)}h waiting`;
  return `${Math.round(hours / 24)}d waiting`;
}

export default function ApprovalsPage() {
  const [inbox, setInbox] = useState<ApprovalInbox | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ApprovalItemType | "all">("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = (keepSelection = false) => {
    setLoading(true);
    approvalsInboxApi
      .getApprovalInbox()
      .then((res) => {
        setInbox(res);
        if (!keepSelection) {
          setSelectedId(res.items[0]?.id ?? null);
        }
      })
      .catch(() => message.error("Failed to load approvals"))
      .finally(() => setLoading(false));
  };

  useEffect(() => load(), []);

  const items = inbox?.items ?? [];
  const filteredItems = useMemo(() => (filter === "all" ? items : items.filter((i) => i.type === filter)), [items, filter]);
  const selected = items.find((i) => i.id === selectedId) ?? filteredItems[0] ?? null;

  const countFor = (key: ApprovalItemType | "all") => (key === "all" ? items.length : items.filter((i) => i.type === key).length);

  const handleDecided = () => {
    message.success("Decision recorded");
    load(false);
  };

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <Title level={3} style={{ margin: 0, letterSpacing: -0.3, color: appTokens.textPrimary }}>
          Approvals
        </Title>
        <Text style={{ color: appTokens.textSecondary, fontSize: 13.5 }}>
          Everything waiting on your decision, across leave, expenses and FOFO onboarding handoffs.
        </Text>
      </div>

      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
        <StatCard label="Waiting on you" value={inbox ? String(inbox.stats.waitingOnYou) : "—"} sub="requests" />
        <StatCard
          label="Breaching SLA"
          value={inbox ? String(inbox.stats.breachingSla) : "—"}
          sub="over 48h"
          labelHint="A fixed 48h threshold, not a configured SLA - FieldForce has no real SLA deadline for these yet."
        />
        <StatCard
          label="Value in queue"
          value={inbox ? `₹${(inbox.stats.valueInQueue / 100000).toFixed(1)}L` : "—"}
          sub={inbox ? `${inbox.stats.valueInQueueCount} item${inbox.stats.valueInQueueCount === 1 ? "" : "s"}` : undefined}
        />
        <StatCard
          label="Approved this week"
          value={inbox ? String(inbox.stats.approvedThisWeek) : "—"}
          sub={inbox?.stats.avgDecisionHours !== null && inbox?.stats.avgDecisionHours !== undefined ? `avg ${inbox.stats.avgDecisionHours.toFixed(1)}h to decide` : undefined}
        />
      </div>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
        {TYPE_FILTERS.map((f) => {
          const active = filter === f.key;
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              style={{
                padding: "5px 12px",
                fontSize: 12.5,
                fontFamily: appTokens.font,
                fontWeight: active ? 600 : 500,
                borderRadius: 999,
                border: `1px solid ${active ? appTokens.primary : appTokens.border}`,
                background: active ? appTokens.primarySoft : appTokens.surface,
                color: active ? appTokens.primary : appTokens.textPrimary,
                cursor: "pointer",
              }}
            >
              {f.label} {countFor(f.key)}
            </button>
          );
        })}
      </div>

      {loading && !inbox ? (
        <div style={{ textAlign: "center", padding: 60 }}>
          <Spin />
        </div>
      ) : (
        <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
          <div
            style={{
              width: 380,
              flexShrink: 0,
              border: `1px solid ${appTokens.border}`,
              borderRadius: appTokens.radius,
              background: appTokens.surface,
              boxShadow: appTokens.shadowSm,
              overflow: "hidden",
            }}
          >
            <div style={{ padding: "12px 16px", borderBottom: `1px solid ${appTokens.borderLight}`, display: "flex", justifyContent: "space-between" }}>
              <Text strong style={{ fontSize: 13 }}>
                Queue
              </Text>
              <Text style={{ fontSize: 11.5, color: appTokens.textTertiary }}>Oldest first</Text>
            </div>
            {filteredItems.length === 0 && (
              <div style={{ padding: "32px 16px", textAlign: "center" }}>
                <Text style={{ fontSize: 13, color: appTokens.textTertiary }}>Nothing waiting on you here.</Text>
              </div>
            )}
            {filteredItems.map((item) => {
              const active = selected?.id === item.id;
              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedId(item.id)}
                  style={{
                    padding: "12px 16px",
                    borderBottom: `1px solid ${appTokens.borderLight}`,
                    borderLeft: `3px solid ${active ? appTokens.primary : "transparent"}`,
                    background: active ? appTokens.primarySoft : "transparent",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                    <Text strong style={{ fontSize: 13 }}>
                      {item.title}
                    </Text>
                    <Text strong style={{ fontSize: 13, flexShrink: 0 }}>
                      {item.valueLabel}
                    </Text>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                    <Tag style={{ margin: 0, fontSize: 10.5, background: appTokens.surfaceMuted, border: "none", color: appTokens.textSecondary }}>
                      {item.typeLabel}
                    </Tag>
                    {item.isPolicyBreach && (
                      <Tag style={{ margin: 0, fontSize: 10.5, background: `${appTokens.warning}17`, border: "none", color: appTokens.warning }}>
                        Policy breach
                      </Tag>
                    )}
                  </div>
                  <Text style={{ fontSize: 11.5, color: appTokens.textTertiary, display: "block", marginTop: 2 }}>{item.subtitle}</Text>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                    <Text style={{ fontSize: 11, color: appTokens.textTertiary }}>{item.stepLabel}</Text>
                    <Text style={{ fontSize: 11, fontWeight: 600, color: item.isSlaBreach ? appTokens.danger : appTokens.textTertiary }}>
                      {item.isSlaBreach && <WarningOutlined style={{ marginRight: 3 }} />}
                      {formatWaiting(item.waitingHours)}
                    </Text>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            {selected ? (
              <ApprovalDetail key={selected.id} item={selected} onDecided={handleDecided} />
            ) : (
              <div
                style={{
                  border: `1px solid ${appTokens.border}`,
                  borderRadius: appTokens.radius,
                  background: appTokens.surface,
                  padding: 60,
                  textAlign: "center",
                }}
              >
                <CheckCircleFilled style={{ fontSize: 28, color: appTokens.success }} />
                <div style={{ marginTop: 8 }}>
                  <Text style={{ color: appTokens.textTertiary }}>Nothing pending - you're caught up.</Text>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function DetailCard({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        border: `1px solid ${appTokens.border}`,
        borderRadius: appTokens.radius,
        background: appTokens.surface,
        boxShadow: appTokens.shadowSm,
        padding: 20,
      }}
    >
      {children}
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <Text style={{ fontSize: 11, color: appTokens.textTertiary, display: "block" }}>{label}</Text>
      <Text style={{ fontSize: 13 }}>{value ?? "—"}</Text>
    </div>
  );
}

function DecisionPanel({
  onApprove,
  onReject,
  loading,
  note,
  onNoteChange,
}: {
  onApprove: () => void;
  onReject: () => void;
  loading: boolean;
  note?: string;
  onNoteChange?: (v: string) => void;
}) {
  return (
    <div style={{ marginTop: 20, paddingTop: 16, borderTop: `1px solid ${appTokens.borderLight}` }}>
      <Text style={{ fontSize: 11, color: appTokens.textTertiary, letterSpacing: 0.4 }}>YOUR DECISION</Text>
      {onNoteChange && (
        <TextArea
          style={{ marginTop: 8 }}
          rows={2}
          value={note}
          onChange={(e) => onNoteChange(e.target.value)}
          placeholder="Add a note for the requester and the audit trail (optional)"
        />
      )}
      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <Button type="primary" loading={loading} onClick={onApprove}>
          Approve
        </Button>
        <Button danger loading={loading} onClick={onReject}>
          Reject
        </Button>
      </div>
      <Text style={{ fontSize: 11, color: appTokens.textTertiary, display: "block", marginTop: 8 }}>
        Decision and timestamp are written to the real record - this actually approves or rejects it.
      </Text>
    </div>
  );
}

function ApprovalDetail({ item, onDecided }: { item: ApprovalQueueItem; onDecided: () => void }) {
  if (item.type === "leave") return <LeaveDetail item={item} onDecided={onDecided} />;
  if (item.type === "expense") return <ExpenseDetail item={item} onDecided={onDecided} />;
  return <FofoDetail item={item} onDecided={onDecided} />;
}

function LeaveDetail({ item, onDecided }: { item: ApprovalQueueItem; onDecided: () => void }) {
  const req = item.raw as LeaveRequest;
  const [saving, setSaving] = useState(false);

  const decide = async (decision: "approved" | "rejected") => {
    setSaving(true);
    try {
      await leaveApi.decideLeaveRequest(req.id, decision);
      onDecided();
    } catch (err) {
      message.error(errorMessageFrom(err, "Failed to record decision"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <DetailCard>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <Title level={5} style={{ margin: 0 }}>
            {req.userName} — {req.kind.replace("_", " ")} leave
          </Title>
          <Text style={{ fontSize: 12, color: appTokens.textTertiary }}>{item.stepLabel}</Text>
        </div>
        <Text strong style={{ fontSize: 18 }}>
          {req.daysCount} day{req.daysCount === 1 ? "" : "s"}
        </Text>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 20 }}>
        <Field label="Dates" value={`${req.startDate} → ${req.endDate}`} />
        <Field label="Cover" value={req.coverUserName ?? "None assigned"} />
        <Field label="Reason" value={req.reason} />
        <Field label="1st approver" value={req.approverDecision === "approved" ? "Approved" : "Pending"} />
      </div>
      <DecisionPanel loading={saving} onApprove={() => decide("approved")} onReject={() => decide("rejected")} />
    </DetailCard>
  );
}

function ExpenseDetail({ item, onDecided }: { item: ApprovalQueueItem; onDecided: () => void }) {
  const claim = item.raw as ExpenseClaim;
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState("");

  const decide = async (decision: "approved" | "rejected") => {
    setSaving(true);
    try {
      await expenseApi.decideExpenseClaim(claim.id, decision, note.trim() || undefined);
      onDecided();
    } catch (err) {
      message.error(errorMessageFrom(err, "Failed to record decision"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <DetailCard>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <Title level={5} style={{ margin: 0 }}>
            {claim.title}
          </Title>
          <Text style={{ fontSize: 12, color: appTokens.textTertiary }}>
            {claim.expenseTypeKey} · raised by {claim.userName} · {item.stepLabel}
          </Text>
        </div>
        <Text strong style={{ fontSize: 18 }}>
          ₹{claim.amount.toLocaleString("en-IN")}
        </Text>
      </div>
      {claim.isPolicyBreach && (
        <Tag style={{ marginTop: 10, background: `${appTokens.warning}17`, border: "none", color: appTokens.warning }}>
          Over policy limit (₹{claim.policyLimitAtSubmission?.toLocaleString("en-IN")})
        </Tag>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 20 }}>
        <Field label="Expense date" value={claim.expenseDate} />
        <Field label="Receipt" value={claim.hasReceipt ? "Attached" : "None"} />
        <Field label="Linked lead" value={claim.linkedLeadLabel} />
        <Field label="Linked opportunity" value={claim.linkedOpportunityLabel} />
      </div>
      <DecisionPanel loading={saving} note={note} onNoteChange={setNote} onApprove={() => decide("approved")} onReject={() => decide("rejected")} />
    </DetailCard>
  );
}

const CHECK_COLOR: Record<string, string> = {
  verified: appTokens.success,
  in_review: appTokens.warning,
  missing: appTokens.danger,
  not_uploaded: appTokens.textTertiary,
};

function FofoDetail({ item, onDecided }: { item: ApprovalQueueItem; onDecided: () => void }) {
  const [handoff, setHandoff] = useState<FofoHandoff | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLoading(true);
    fofoApi
      .getHandoff(item.refId)
      .then(setHandoff)
      .catch(() => message.error("Failed to load this handoff"))
      .finally(() => setLoading(false));
  }, [item.refId]);

  const currentStep = handoff?.approvalSteps.find((s) => s.isCurrentTurn);

  const decide = async (decision: "approved" | "rejected") => {
    if (!currentStep) return;
    setSaving(true);
    try {
      await fofoApi.decideStep(currentStep.id, decision);
      onDecided();
    } catch (err) {
      message.error(errorMessageFrom(err, "Failed to record decision"));
    } finally {
      setSaving(false);
    }
  };

  if (loading || !handoff) {
    return (
      <DetailCard>
        <div style={{ textAlign: "center", padding: 40 }}>
          <Spin />
        </div>
      </DetailCard>
    );
  }

  const { lead } = handoff;

  return (
    <DetailCard>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <Title level={5} style={{ margin: 0 }}>
            {lead.storeName ?? lead.fullName}
          </Title>
          <Text style={{ fontSize: 12, color: appTokens.textTertiary }}>
            FOFO · Lead #{lead.leadNumber} · raised by {lead.ownerName ?? "Unknown"}
          </Text>
        </div>
        <Text strong style={{ fontSize: 18 }}>
          {lead.expectedValue !== null ? `₹${(lead.expectedValue / 100000).toFixed(1)}L` : "—"}
        </Text>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 20 }}>
        <Field label="Store location" value={[lead.storeCity, lead.storeState].filter(Boolean).join(", ") || null} />
        <Field label="GST" value={lead.gstNumber} />
        <Field label="Investment" value={lead.investmentCapacity !== null ? `₹${lead.investmentCapacity.toLocaleString("en-IN")}` : null} />
        <Field label="Credit category" value={lead.creditCategory} />
        <Field label="Target go-live" value={lead.targetGoLive} />
        <Field label="Onboarding app ID" value={lead.onboardingAppId} />
      </div>

      <div style={{ marginTop: 20 }}>
        <Text style={{ fontSize: 11, color: appTokens.textTertiary, letterSpacing: 0.4 }}>CHECKS</Text>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 6 }}>
          {handoff.documents.map((doc) => (
            <div key={doc.id} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
              <Text style={{ fontSize: 12.5 }}>
                {doc.status === "verified" ? (
                  <CheckCircleFilled style={{ color: CHECK_COLOR.verified, marginRight: 6 }} />
                ) : (
                  <ClockCircleOutlined style={{ color: CHECK_COLOR[doc.status], marginRight: 6 }} />
                )}
                {doc.label}
              </Text>
              <Text style={{ fontSize: 11.5, color: CHECK_COLOR[doc.status] }}>{doc.status.replace("_", " ")}</Text>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 20 }}>
        <Text style={{ fontSize: 11, color: appTokens.textTertiary, letterSpacing: 0.4 }}>APPROVAL CHAIN</Text>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 6 }}>
          {handoff.approvalSteps.map((step) => (
            <div key={step.id} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
              <div>
                <Text style={{ fontSize: 12.5 }}>{step.approverName ?? "Unassigned"}</Text>
                <Text style={{ fontSize: 11, color: appTokens.textTertiary, display: "block" }}>{step.roleLabel}</Text>
              </div>
              <Tag
                style={{
                  margin: 0,
                  height: "fit-content",
                  border: "none",
                  fontWeight: 600,
                  color:
                    step.status === "approved" ? appTokens.success : step.status === "rejected" ? appTokens.danger : step.isCurrentTurn ? appTokens.warning : appTokens.textTertiary,
                  background:
                    step.status === "approved"
                      ? `${appTokens.success}17`
                      : step.status === "rejected"
                        ? `${appTokens.danger}17`
                        : step.isCurrentTurn
                          ? `${appTokens.warning}17`
                          : appTokens.surfaceMuted,
                }}
              >
                {step.status === "pending" ? (step.isCurrentTurn ? "Pending" : "Waiting") : step.status.replace("_", " ")}
              </Tag>
            </div>
          ))}
        </div>
      </div>

      {currentStep && <DecisionPanel loading={saving} onApprove={() => decide("approved")} onReject={() => decide("rejected")} />}
    </DetailCard>
  );
}
