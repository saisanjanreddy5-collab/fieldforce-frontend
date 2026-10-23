import { useEffect, useMemo, useState } from "react";
import { App, Avatar, Button, Drawer, Dropdown, Empty, Form, Input, Modal, Select, Table, Tabs, Tag, Typography } from "antd";
import { DownOutlined, PhoneOutlined, PlayCircleOutlined, PlusOutlined, SearchOutlined } from "@ant-design/icons";
import * as callCenterApi from "../api/call-center-api";
import * as smartfloApi from "../api/smartflo-api";
import * as customerExtrasApi from "../api/customer-extras-api";
import * as leadApi from "../api/lead-api";
import type { Call } from "../types/call";
import type { CustomerContact } from "../types/customer-extras";
import type { Lead } from "../types/lead";
import { useHasPermission } from "../hooks/use-permission";
import { useLeadCategories } from "../hooks/use-lead-categories";
import { errorMessageFrom } from "../utils/api-error";
import { avatarGradient, appTokens } from "../utils/design-system";
import { formatDate, formatDurationSeconds, formatFollowUpDate, initials } from "../utils/lead-format";
import { LeadDetail } from "../components/leads/LeadDetail";
import { LeadFormDrawer } from "../components/leads/LeadFormDrawer";

const { Title, Text } = Typography;

// Red/neutral/green, roughly worst-to-best outcome, so a glance at the
// queue shows which leads need another push without reading every label.
const DISPOSITION_COLORS: Record<string, string> = {
  Ringing: appTokens.textTertiary,
  "Not Reachable": appTokens.warning,
  "Switched Off": appTokens.warning,
  Language: appTokens.warning,
  "Call Back": appTokens.primary,
  "Call Done And Interested": appTokens.success,
  "Call Done And Not Interested": appTokens.danger,
};

const EMPTY_STATS: callCenterApi.CallCenterStats = {
  callsToday: 0,
  connectedPercent: 0,
  avgHandleSeconds: null,
  recordedPercent: 0,
  inQueue: 0,
  overdueInQueue: 0,
};

export default function CallCenterPage() {
  const { message } = App.useApp();
  const hasPermission = useHasPermission();
  const [calls, setCalls] = useState<Call[]>([]);
  const [queue, setQueue] = useState<Call[]>([]);
  const [stats, setStats] = useState<callCenterApi.CallCenterStats>(EMPTY_STATS);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [callingLeadId, setCallingLeadId] = useState<string | null>(null);
  // Queue items whose lead has converted to a customer - keyed by
  // customerId, so the "Call" button can offer a per-contact picker
  // instead of always dialing the lead's own number. Prefetched once per
  // load (the queue is already small/capped), not on click, so opening the
  // picker is instant.
  const [queueContacts, setQueueContacts] = useState<Record<string, CustomerContact[]>>({});

  // Stats come from a real SQL aggregate over every call this user can
  // see (call-center-service.ts's getCallCenterStats), not arithmetic over
  // whatever page of calls happens to be loaded - the log view below is
  // capped (200, then paginated 20 at a time for display), and computing
  // percentages over that cap used to silently understate reality once an
  // org passed 200 historical calls despite the UI still saying "of all
  // calls". "Today" is IST-anchored there too, not the viewer's browser
  // clock.
  const load = () => {
    setLoading(true);
    Promise.all([callCenterApi.listCalls(), callCenterApi.listUpcomingCalls(), callCenterApi.getStats()])
      .then(async ([log, upcoming, callStats]) => {
        setCalls(log.calls);
        setQueue(upcoming);
        setStats(callStats);

        const customerIds = [...new Set(upcoming.map((c) => c.customerId).filter((id): id is string => id !== null))];
        const contactLists = await Promise.all(customerIds.map((id) => customerExtrasApi.listContacts(id).catch(() => [])));
        setQueueContacts(Object.fromEntries(customerIds.map((id, i) => [id, contactLists[i]])));
      })
      .catch(() => message.error("Failed to load calls"))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return calls;
    return calls.filter(
      (c) =>
        (c.leadFullName ?? "").toLowerCase().includes(q) ||
        (c.leadPhone ?? "").toLowerCase().includes(q) ||
        (c.assignedToName ?? "").toLowerCase().includes(q)
    );
  }, [calls, search]);

  const handleCall = async (leadId: string | null, override?: { phone: string; contactName?: string }) => {
    if (!leadId) return;
    setCallingLeadId(leadId);
    try {
      // By the time this resolves, smartflo-service.ts has already logged
      // the new call as an Activity - reload so it shows up right away (as
      // "In progress", until the webhook fills in the real outcome) instead
      // of only appearing after a manual page refresh.
      await smartfloApi.callLead(leadId, override);
      message.success(override ? `Calling ${override.contactName ?? override.phone}` : "Calling now");
      load();
    } catch (err) {
      message.error(errorMessageFrom(err, "Failed to place the call"));
    } finally {
      setCallingLeadId(null);
    }
  };

  if (!hasPermission("call_center.view")) {
    return (
      <div>
        <Title level={3}>Call center</Title>
        <Text type="secondary">You do not have permission to view call center.</Text>
      </div>
    );
  }

  // Whoever can log a call against a Call Center lead gets the queue tab -
  // today that's call_center employees plus Admin/Manager, never a plain
  // field agent (that work happens on their own leads via the lead detail
  // page instead, not this queue).
  const canWorkQueue = hasPermission("leads.call_log");

  const dashboardPanel = (
    <>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
        {[
          { label: "Calls today", value: String(stats.callsToday), subtitle: "placed today" },
          { label: "Connected", value: `${stats.connectedPercent}%`, subtitle: "of all calls" },
          { label: "Avg handle time", value: stats.avgHandleSeconds !== null ? formatDurationSeconds(stats.avgHandleSeconds) : "—", subtitle: "per connected call" },
          { label: "In queue", value: String(stats.inQueue), subtitle: stats.overdueInQueue > 0 ? `${stats.overdueInQueue} overdue` : "scheduled" },
          { label: "Recorded", value: `${stats.recordedPercent}%`, subtitle: "have a saved recording" },
        ].map((stat) => (
          <div
            key={stat.label}
            style={{
              flex: 1,
              minWidth: 150,
              border: `1px solid ${appTokens.borderLight}`,
              borderRadius: appTokens.radius,
              padding: "10px 14px",
              background: appTokens.surface,
              boxShadow: appTokens.shadowXs,
            }}
          >
            <Text style={{ fontSize: 11.5, fontWeight: 600, color: appTokens.textTertiary, display: "block", whiteSpace: "nowrap" }}>{stat.label}</Text>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 1, flexWrap: "wrap" }}>
              <span style={{ fontSize: 19, fontWeight: 700, color: appTokens.textPrimary, letterSpacing: -0.3, whiteSpace: "nowrap" }}>{stat.value}</span>
              <Text style={{ fontSize: 11, color: appTokens.textTertiary, whiteSpace: "nowrap" }}>{stat.subtitle}</Text>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
        <div
          style={{
            flex: "1 1 64%",
            minWidth: 0,
            border: `1px solid ${appTokens.border}`,
            borderRadius: appTokens.radius,
            background: appTokens.surface,
            boxShadow: appTokens.shadowXs,
            overflow: "hidden",
          }}
        >
          <div style={{ padding: 14, borderBottom: `1px solid ${appTokens.borderLight}`, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <Text strong style={{ fontSize: 13, color: appTokens.textPrimary }}>
              Call log
            </Text>
            <Input
              placeholder="Search customer, phone, or caller"
              prefix={<SearchOutlined style={{ color: appTokens.textTertiary }} />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              allowClear
              style={{ maxWidth: 320 }}
            />
          </div>

          <Table<Call>
            rowKey="id"
            size="small"
            loading={loading}
            dataSource={filtered}
            pagination={filtered.length > 20 ? { pageSize: 20 } : false}
            tableLayout="fixed"
            className="thin-scroll-table table-row-hover"
            locale={{ emptyText: loading ? " " : "No calls yet - calls placed from a lead's page will show up here" }}
            columns={[
              {
                title: "Customer",
                key: "customer",
                width: "34%",
                render: (_, c) => (
                  <div style={{ display: "flex", gap: 7, alignItems: "center", overflow: "hidden" }}>
                    <Avatar size={24} style={{ background: avatarGradient(c.leadFullName ?? "?"), fontSize: 10, fontWeight: 600, flexShrink: 0 }}>
                      {c.leadFullName ? initials(c.leadFullName) : "?"}
                    </Avatar>
                    <div style={{ minWidth: 0, overflow: "hidden" }}>
                      <Text
                        strong
                        style={{ color: appTokens.textPrimary, display: "block", fontSize: 12.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
                        title={c.leadFullName ?? undefined}
                      >
                        {c.leadFullName ?? <Text type="secondary">—</Text>}
                      </Text>
                      {(c.referenceLabel || c.category) && (
                        <Text type="secondary" style={{ fontSize: 11, display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {[c.referenceLabel, c.category].filter(Boolean).join(" · ")}
                        </Text>
                      )}
                    </div>
                  </div>
                ),
              },
              {
                title: "Caller",
                key: "caller",
                width: "20%",
                render: (_, c) => (
                  <div style={{ minWidth: 0, overflow: "hidden" }}>
                    <Text style={{ fontSize: 12.5, display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {c.assignedToName ?? <Text type="secondary">—</Text>}
                    </Text>
                    <Text type="secondary" style={{ fontSize: 11, display: "block", whiteSpace: "nowrap" }}>
                      {formatDate(c.createdAt)}
                    </Text>
                  </div>
                ),
              },
              {
                title: "Outcome",
                key: "outcome",
                width: "30%",
                render: (_, c) =>
                  c.outcome ? (
                    <Tag
                      color={c.outcome.startsWith("Connected") ? appTokens.success : appTokens.textTertiary}
                      style={{ margin: 0, fontSize: 11, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%" }}
                    >
                      {c.outcome}
                    </Tag>
                  ) : (
                    <Tag style={{ margin: 0, fontSize: 11 }}>In progress</Tag>
                  ),
              },
              {
                title: "",
                key: "recording",
                width: "16%",
                render: (_, c) =>
                  c.recordingUrl ? (
                    <a href={c.recordingUrl} target="_blank" rel="noreferrer" style={{ fontSize: 12.5, whiteSpace: "nowrap" }}>
                      <PlayCircleOutlined /> Play
                    </a>
                  ) : (
                    <Text type="secondary">—</Text>
                  ),
              },
            ]}
          />
        </div>

        <div
          style={{
            flex: "1 1 36%",
            minWidth: 260,
            border: `1px solid ${appTokens.border}`,
            borderRadius: appTokens.radius,
            background: appTokens.surface,
            boxShadow: appTokens.shadowXs,
            overflow: "hidden",
          }}
        >
          <div style={{ padding: 14, borderBottom: `1px solid ${appTokens.borderLight}` }}>
            <Text strong style={{ fontSize: 13, color: appTokens.textPrimary, display: "block" }}>
              Call queue
            </Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Callbacks you've scheduled, not yet made
            </Text>
          </div>
          <div style={{ padding: 10, display: "flex", flexDirection: "column", gap: 8 }}>
            {queue.length === 0 ? (
              <Text type="secondary" style={{ fontSize: 13, padding: "10px 4px" }}>
                Nothing queued right now
              </Text>
            ) : (
              queue.map((c) => {
                const due = formatFollowUpDate(c.dueDate);
                return (
                  <div
                    key={c.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 8,
                      padding: "9px 10px",
                      border: `1px solid ${due?.overdue ? appTokens.danger : appTokens.borderLight}`,
                      borderRadius: 8,
                    }}
                  >
                    <div style={{ minWidth: 0, overflow: "hidden" }}>
                      <Text strong style={{ fontSize: 13, display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={c.leadFullName ?? undefined}>
                        {c.leadFullName ?? "Unknown"}
                      </Text>
                      <Text
                        type={due?.overdue ? "danger" : "secondary"}
                        style={{ fontSize: 11.5, display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
                      >
                        {c.subject ?? "Follow-up call"}
                        {due ? ` · ${due.label}` : ""}
                      </Text>
                    </div>
                    {(() => {
                      const contacts = c.customerId ? queueContacts[c.customerId] : undefined;
                      // Only a real choice when this lead's converted customer
                      // actually has contacts on file - otherwise there's
                      // nothing to pick between and this stays a plain button,
                      // same as before.
                      if (!contacts || contacts.length === 0) {
                        return (
                          <Button
                            size="small"
                            type="primary"
                            ghost
                            icon={<PhoneOutlined />}
                            loading={callingLeadId === c.leadId}
                            disabled={!c.leadId}
                            onClick={() => handleCall(c.leadId)}
                          >
                            Call
                          </Button>
                        );
                      }
                      return (
                        <Dropdown
                          menu={{
                            items: [
                              { key: "__lead__", label: `${c.leadFullName ?? "Lead"}'s own number${c.leadPhone ? ` (${c.leadPhone})` : ""}` },
                              { type: "divider" },
                              ...contacts.map((contact) => ({
                                key: contact.id,
                                label: `${contact.name}${contact.phone ? ` (${contact.phone})` : ""}`,
                                disabled: !contact.phone,
                              })),
                            ],
                            onClick: ({ key }) => {
                              if (key === "__lead__") {
                                handleCall(c.leadId);
                                return;
                              }
                              const contact = contacts.find((ct) => ct.id === key);
                              if (contact?.phone) {
                                handleCall(c.leadId, { phone: contact.phone, contactName: contact.name });
                              }
                            },
                          }}
                          trigger={["click"]}
                        >
                          <Button size="small" type="primary" ghost icon={<PhoneOutlined />} loading={callingLeadId === c.leadId} disabled={!c.leadId}>
                            Call <DownOutlined style={{ fontSize: 9 }} />
                          </Button>
                        </Dropdown>
                      );
                    })()}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </>
  );

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
        <div>
          <Title level={3} style={{ margin: 0, letterSpacing: -0.3, color: appTokens.textPrimary }}>
            Call center
          </Title>
          <Text style={{ color: appTokens.textSecondary, fontSize: 13.5 }}>
            {canWorkQueue
              ? "Your assigned leads awaiting qualification, plus every call made through Smartflo."
              : "Every click-to-call made through Smartflo, written back to the lead automatically."}
          </Text>
        </div>
      </div>

      {canWorkQueue ? (
        <Tabs
          defaultActiveKey="queue"
          items={[
            { key: "queue", label: "My queue", children: <MyQueueTab /> },
            { key: "dashboard", label: "Dashboard", children: dashboardPanel },
          ]}
        />
      ) : (
        dashboardPanel
      )}
    </div>
  );
}

interface AddLeadFormValues {
  fullName: string;
  phone?: string;
  email?: string;
  pincode?: string;
  category?: string;
}

// The one gap left once a Call Center agent could only ever work leads that
// landed in their queue automatically (bulk import, website form, QR
// campaign) - someone calling the business number directly had nowhere to
// be logged at all. Deliberately a short, mid-call-friendly form: only the
// name is required, since the agent is often still asking the rest of these
// while filling it in - the rest (pincode especially, since that's what
// Send to Field Sales matches on) can be filled in later from the lead's own
// Edit screen once qualified.
function AddLeadModal({ open, onClose, onAdded }: { open: boolean; onClose: () => void; onAdded: () => void }) {
  const { message } = App.useApp();
  const { categories } = useLeadCategories();
  const [form] = Form.useForm<AddLeadFormValues>();
  const [submitting, setSubmitting] = useState(false);

  const submit = async (values: AddLeadFormValues) => {
    setSubmitting(true);
    try {
      await leadApi.createOwnQueueLead(values);
      message.success("Lead added to your queue");
      form.resetFields();
      onAdded();
    } catch (err) {
      message.error(errorMessageFrom(err, "Failed to add this lead"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title="Add lead to your queue"
      open={open}
      onCancel={onClose}
      onOk={() => form.submit()}
      okText="Add lead"
      confirmLoading={submitting}
      destroyOnClose
    >
      <Form form={form} layout="vertical" onFinish={submit} style={{ marginTop: 8 }}>
        <Form.Item name="fullName" label="Full name" rules={[{ required: true, message: "Full name is required" }]}>
          <Input placeholder="Who are you speaking with?" />
        </Form.Item>
        <Form.Item
          name="phone"
          label="Phone"
          rules={[
            { required: true, message: "Phone is required" },
            { pattern: /^\d{10}$/, message: "Enter a 10-digit mobile number" },
          ]}
        >
          <Input placeholder="10-digit mobile number" />
        </Form.Item>
        <Form.Item name="email" label="Email">
          <Input placeholder="Optional" />
        </Form.Item>
        <Form.Item name="pincode" label="Pincode" extra="Needed later to auto-match the right field employee - fine to leave blank for now and add it once you have it.">
          <Input placeholder="Optional for now" />
        </Form.Item>
        <Form.Item name="category" label="Category">
          <Select
            allowClear
            placeholder="Optional"
            options={categories.filter((c) => c.isActive).map((c) => ({ value: c.key, label: c.label }))}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}

function MyQueueTab() {
  const { message } = App.useApp();
  const hasPermission = useHasPermission();
  // Checked on its own, not assumed to come bundled with leads.call_log -
  // an admin can revoke permissions independently per employee from the
  // Permissions screen, so this button must only show when its own specific
  // permission is actually granted.
  const canAddToQueue = hasPermission("leads.queue_create");
  // Two separate stages shown as two sections - a lead vanishing from view
  // the instant it's marked Qualified left no place to ever click Send to
  // Field Sales, so both stages of this agent's own queue are fetched.
  const [callingLeads, setCallingLeads] = useState<Lead[]>([]);
  const [qualifiedLeads, setQualifiedLeads] = useState<Lead[]>([]);
  // Leads this person used to own and has since sent to Field Sales -
  // without this, the queue going empty read as the work having vanished
  // rather than finished (see leadApi.listHandedOffLeads's own comment).
  // Read-only: renderRow hides the inline Call button for these.
  const [handedOffLeads, setHandedOffLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [callingLeadId, setCallingLeadId] = useState<string | null>(null);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [editDrawerOpen, setEditDrawerOpen] = useState(false);
  const [addLeadOpen, setAddLeadOpen] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([
      leadApi.listLeads({ status: "Call Center", limit: 100 }),
      leadApi.listLeads({ status: "Qualified", limit: 100 }),
      leadApi.listHandedOffLeads(),
    ])
      .then(([callCenter, qualified, handedOff]) => {
        // status alone can't tell "I still own this" apart from "I used to
        // own this" - sendToField never changes status (see
        // lead-call-center-service.ts's own comment on that), so a leftover
        // lead_shares grant on an already-handed-off lead that happens to
        // still read "Qualified" would otherwise show up here too, with its
        // full Call button, duplicating (and contradicting) its real place
        // in "Already sent" below. inOwnerScope is the real signal.
        setCallingLeads(callCenter.leads.filter((l) => l.inOwnerScope));
        setQualifiedLeads(qualified.leads.filter((l) => l.inOwnerScope));
        setHandedOffLeads(handedOff);
      })
      .catch(() => message.error("Failed to load your queue"))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);
  const leads = [...callingLeads, ...qualifiedLeads, ...handedOffLeads];
  // Derived, not stored - once a lead leaves this agent's queue entirely
  // (sent to field, no longer theirs), it drops out of `leads` on the next
  // reload and this naturally resolves to undefined, which closes the
  // detail drawer instead of leaving it showing a stale, no-longer-owned
  // lead.
  const selectedLead = leads.find((l) => l.id === selectedLeadId);

  const handleCall = async (leadId: string) => {
    setCallingLeadId(leadId);
    try {
      await smartfloApi.callLead(leadId);
      message.success("Calling now");
    } catch (err) {
      message.error(errorMessageFrom(err, "Failed to place the call"));
    } finally {
      setCallingLeadId(null);
    }
  };

  // A scannable summary row per lead - full detail (edit customer info,
  // Call/Email/Teams/WhatsApp, call history and comments, Log call outcome/
  // Mark Qualified/Send to Field Sales) lives one click away in the Drawer
  // below, reusing the exact same LeadDetail a field rep or admin sees
  // elsewhere, so there's one real workspace for a lead, not a second
  // parallel one just for Call Center.
  const renderRow = (lead: Lead, options?: { showCallButton?: boolean }) => (
    <div
      key={lead.id}
      onClick={() => setSelectedLeadId(lead.id)}
      style={{
        border: `1px solid ${appTokens.border}`,
        borderRadius: appTokens.radius,
        background: appTokens.surface,
        boxShadow: appTokens.shadowXs,
        padding: 14,
        cursor: "pointer",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 10,
        flexWrap: "wrap",
      }}
    >
      <div style={{ display: "flex", gap: 10, alignItems: "center", minWidth: 0 }}>
        <Avatar size={34} style={{ background: avatarGradient(lead.fullName), fontWeight: 600, flexShrink: 0 }}>
          {initials(lead.fullName)}
        </Avatar>
        <div style={{ minWidth: 0 }}>
          <Text strong style={{ fontSize: 14, display: "block" }}>
            {lead.fullName}
          </Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {[lead.phone, lead.pincode ? `PIN ${lead.pincode}` : "no pincode yet", lead.category].filter(Boolean).join(" · ")}
          </Text>
        </div>
      </div>
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        {lead.lastCallOutcome && (
          <Tag color={DISPOSITION_COLORS[lead.lastCallOutcome] ?? "default"} style={{ margin: 0, fontSize: 11 }}>
            {lead.lastCallOutcome}
          </Tag>
        )}
        <Text type="secondary" style={{ fontSize: 11.5, whiteSpace: "nowrap" }}>
          {lead.callAttemptCount} call{lead.callAttemptCount === 1 ? "" : "s"} so far
          {lead.lastCallAt ? ` · last ${formatDate(lead.lastCallAt)}` : ""}
        </Text>
        {(options?.showCallButton ?? true) && (
          <Button
            size="small"
            type="primary"
            ghost
            icon={<PhoneOutlined />}
            loading={callingLeadId === lead.id}
            onClick={(e) => {
              e.stopPropagation();
              handleCall(lead.id);
            }}
          >
            Call
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      {canAddToQueue && (
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setAddLeadOpen(true)}>
            Add lead
          </Button>
        </div>
      )}

      {loading && leads.length === 0 && <Text type="secondary">Loading your queue...</Text>}

      {!loading && leads.length === 0 && (
        <div style={{ padding: "40px 0", textAlign: "center" }}>
          <Text type="secondary" style={{ fontSize: 13.5 }}>
            Nothing in your queue right now - new marketing leads will land here automatically
            {canAddToQueue && ', or use "Add lead" above for someone who called in directly'}.
          </Text>
        </div>
      )}

      {qualifiedLeads.length > 0 && (
        <div>
          <Text strong style={{ fontSize: 12.5, color: appTokens.textTertiary, textTransform: "uppercase", letterSpacing: 0.3 }}>
            Qualified - ready for Field Sales ({qualifiedLeads.length})
          </Text>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>{qualifiedLeads.map((l) => renderRow(l))}</div>
        </div>
      )}
      {callingLeads.length > 0 && (
        <div>
          <Text strong style={{ fontSize: 12.5, color: appTokens.textTertiary, textTransform: "uppercase", letterSpacing: 0.3 }}>
            Awaiting qualification ({callingLeads.length})
          </Text>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>{callingLeads.map((l) => renderRow(l))}</div>
        </div>
      )}
      {handedOffLeads.length > 0 && (
        <div>
          <Text strong style={{ fontSize: 12.5, color: appTokens.textTertiary, textTransform: "uppercase", letterSpacing: 0.3 }}>
            Already sent to Field Sales ({handedOffLeads.length})
          </Text>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
            {handedOffLeads.map((l) => renderRow(l, { showCallButton: false }))}
          </div>
        </div>
      )}

      <AddLeadModal open={addLeadOpen} onClose={() => setAddLeadOpen(false)} onAdded={() => { setAddLeadOpen(false); load(); }} />

      <Drawer
        title={selectedLead?.fullName ?? ""}
        open={Boolean(selectedLead)}
        onClose={() => setSelectedLeadId(null)}
        width={820}
        destroyOnClose
      >
        {selectedLead ? (
          <LeadDetail
            lead={selectedLead}
            showOwner={false}
            onEdit={() => {
              setEditingLead(selectedLead);
              setEditDrawerOpen(true);
            }}
            onLeadUpdated={load}
          />
        ) : (
          <Empty description="This lead is no longer in your queue" />
        )}
      </Drawer>

      <LeadFormDrawer
        open={editDrawerOpen}
        lead={editingLead}
        onClose={() => {
          setEditDrawerOpen(false);
          setEditingLead(null);
        }}
        onSaved={() => {
          load();
          setEditDrawerOpen(false);
          setEditingLead(null);
        }}
      />
    </div>
  );
}
