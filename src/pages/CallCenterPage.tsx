import { useEffect, useMemo, useState } from "react";
import { App, Avatar, Button, Drawer, Dropdown, Empty, Form, Input, Modal, Pagination, Popover, Select, Table, Tag, Typography } from "antd";
import { DownOutlined, PhoneOutlined, PlayCircleOutlined, PlusOutlined, SearchOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import * as callCenterApi from "../api/call-center-api";
import * as smartfloApi from "../api/smartflo-api";
import * as customerExtrasApi from "../api/customer-extras-api";
import * as leadApi from "../api/lead-api";
import type { Call } from "../types/call";
import type { CustomerContact } from "../types/customer-extras";
import type { Lead } from "../types/lead";
import { useAuth } from "../context/AuthContext";
import { useHasPermission } from "../hooks/use-permission";
import { useLeadCategories } from "../hooks/use-lead-categories";
import { FLC_STAGE, LEAD_STATUS_COLORS, NEW_STAGE, SLC_STAGE } from "../utils/lead-constants";
import { errorMessageFrom } from "../utils/api-error";
import { avatarGradient, appTokens } from "../utils/design-system";
import { StatsRow } from "../components/StatsRow";
import { formatDate, formatDurationSeconds, formatFollowUpDate, initials } from "../utils/lead-format";
import { LeadDetail } from "../components/leads/LeadDetail";
import { LeadFormDrawer } from "../components/leads/LeadFormDrawer";
import { DuplicateLeadTag } from "../components/leads/DuplicateLeadTag";
import { ImportLeadsModal } from "../components/leads/ImportLeadsModal";
import { LeadFilters, type AdvancedFilters } from "../components/leads/LeadFilters";

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

const TIER_LABELS: Record<string, string> = {
  [NEW_STAGE]: "New",
  [FLC_STAGE]: "FLC",
  [SLC_STAGE]: "SLC",
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
  const [activeTab, setActiveTab] = useState<"queue" | "dashboard">("queue");
  const [calls, setCalls] = useState<Call[]>([]);
  const [queue, setQueue] = useState<Call[]>([]);
  const [stats, setStats] = useState<callCenterApi.CallCenterStats>(EMPTY_STATS);
  const [loading, setLoading] = useState(true);
  const [streamProgress, setStreamProgress] = useState<{ loaded: number; total: number } | null>(null);
  const [search, setSearch] = useState("");
  const [callLogPage, setCallLogPage] = useState(1);
  const [callingLeadId, setCallingLeadId] = useState<string | null>(null);
  // Queue items whose lead has converted to a customer - keyed by
  // customerId, so the "Call" button can offer a per-contact picker
  // instead of always dialing the lead's own number. Prefetched once per
  // load (the queue is already small/capped), not on click, so opening the
  // picker is instant.
  const [queueContacts, setQueueContacts] = useState<Record<string, CustomerContact[]>>({});

  // Stats come from a real SQL aggregate over every call this user can see
  // (call-center-service.ts's getCallCenterStats), not arithmetic over
  // whatever page of calls happens to be loaded, so they're always accurate
  // regardless of how much of the log has streamed in below. The log itself
  // used to hard-cap at 200 in one shot - any call past that was invisible,
  // not just slow - now drains every real page (listAllCalls), streaming
  // results in as they arrive so the table is usable immediately rather
  // than blocking on the whole history loading first.
  const load = () => {
    setLoading(true);
    setStreamProgress(null);
    Promise.all([
      callCenterApi.listAllCalls({}, (loadedSoFar, total) => {
        setCalls(loadedSoFar);
        setLoading(false);
        setStreamProgress(loadedSoFar.length < total ? { loaded: loadedSoFar.length, total } : null);
      }),
      callCenterApi.listUpcomingCalls(),
      callCenterApi.getStats(),
    ])
      .then(async ([, upcoming, callStats]) => {
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

  const CALL_LOG_PAGE_SIZE = 20;
  const pagedCalls = useMemo(
    () => filtered.slice((callLogPage - 1) * CALL_LOG_PAGE_SIZE, callLogPage * CALL_LOG_PAGE_SIZE),
    [filtered, callLogPage]
  );

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
      <div style={{ marginBottom: 14 }}>
        <StatsRow
          stats={[
            { label: "Calls today", value: String(stats.callsToday), subtitle: "placed today" },
            { label: "Connected", value: `${stats.connectedPercent}%`, subtitle: "of all calls" },
            { label: "Avg handle time", value: stats.avgHandleSeconds !== null ? formatDurationSeconds(stats.avgHandleSeconds) : "—", subtitle: "per connected call" },
            { label: "In queue", value: String(stats.inQueue), subtitle: stats.overdueInQueue > 0 ? `${stats.overdueInQueue} overdue` : "scheduled" },
            { label: "Recorded", value: `${stats.recordedPercent}%`, subtitle: "have a saved recording" },
          ]}
        />
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
              onChange={(e) => {
                setSearch(e.target.value);
                setCallLogPage(1);
              }}
              allowClear
              style={{ maxWidth: 320 }}
            />
          </div>

          {streamProgress && (
            <div
              style={{
                margin: "10px 14px 0",
                padding: "7px 12px",
                borderRadius: appTokens.radius,
                background: appTokens.primarySoft,
                border: `1px solid ${appTokens.border}`,
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <span
                style={{
                  width: 13,
                  height: 13,
                  borderRadius: "50%",
                  border: `2px solid ${appTokens.primary}`,
                  borderTopColor: "transparent",
                  flexShrink: 0,
                  animation: "callcenter-stream-spin 0.7s linear infinite",
                }}
              />
              <Text style={{ fontSize: 12, color: appTokens.textSecondary }}>
                Loading the rest of the call log - {streamProgress.loaded.toLocaleString()} of {streamProgress.total.toLocaleString()}
              </Text>
              <style>{"@keyframes callcenter-stream-spin { to { transform: rotate(360deg); } }"}</style>
            </div>
          )}

          <div style={{ maxHeight: 520, overflowY: "auto" }}>
          <Table<Call>
            rowKey="id"
            size="small"
            loading={loading}
            dataSource={pagedCalls}
            pagination={false}
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
                    // Real fix for "Play redirects to an external website" -
                    // this used to be a plain <a target="_blank"> to the raw
                    // recording file, navigating the whole tab away. A
                    // Popover with a real <audio> element plays it in place,
                    // never leaving this page.
                    <Popover
                      trigger="click"
                      placement="left"
                      content={
                        <audio controls autoPlay style={{ width: 260 }}>
                          <source src={c.recordingUrl} />
                        </audio>
                      }
                    >
                      <Button type="link" size="small" style={{ fontSize: 12.5, whiteSpace: "nowrap", padding: 0 }} icon={<PlayCircleOutlined />}>
                        Play
                      </Button>
                    </Popover>
                  ) : (
                    <Text type="secondary">—</Text>
                  ),
              },
            ]}
          />
          </div>
          {filtered.length > 0 && (
            <div style={{ display: "flex", justifyContent: "center", padding: "12px 14px", borderTop: `1px solid ${appTokens.borderLight}` }}>
              <Pagination
                size="small"
                current={callLogPage}
                pageSize={CALL_LOG_PAGE_SIZE}
                total={filtered.length}
                onChange={setCallLogPage}
                showSizeChanger={false}
              />
            </div>
          )}
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
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14, flexWrap: "wrap", gap: 8, flexShrink: 0 }}>
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
        <>
          <div style={{ display: "flex", gap: 6, marginBottom: 14, flexShrink: 0 }}>
            {(
              [
                { key: "queue", label: "My queue" },
                { key: "dashboard", label: "Dashboard" },
              ] as const
            ).map((tab) => {
              const active = activeTab === tab.key;
              return (
                <Button
                  key={tab.key}
                  size="small"
                  shape="round"
                  onClick={() => setActiveTab(tab.key)}
                  style={{
                    background: appTokens.surface,
                    borderWidth: active ? 1.5 : 1,
                    borderColor: active ? appTokens.primary : appTokens.border,
                    color: active ? appTokens.primary : appTokens.textSecondary,
                    fontWeight: active ? 600 : 500,
                  }}
                >
                  {tab.label}
                </Button>
              );
            })}
          </div>
          <div style={{ flex: 1, minHeight: 0, display: activeTab === "queue" ? "flex" : "none", flexDirection: "column" }}>
            <MyQueueTab />
          </div>
          {activeTab === "dashboard" && <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>{dashboardPanel}</div>}
        </>
      ) : (
        <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>{dashboardPanel}</div>
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
  const { user } = useAuth();
  const hasPermission = useHasPermission();
  // Checked on its own, not assumed to come bundled with leads.call_log -
  // an admin can revoke permissions independently per employee from the
  // Permissions screen, so this button must only show when its own specific
  // permission is actually granted.
  const canAddToQueue = hasPermission("leads.queue_create");
  // leads.bulk_import is Call Center's own scoped version of the Leads
  // page's bulk-import (executive-matched by email/employee code) -
  // leads.create (Admin/Manager) also works, matching the backend route's
  // own requireAnyPermission.
  const canBulkImport = hasPermission("leads.create") || hasPermission("leads.bulk_import");
  // Client-confirmed, explicit: every Call Center Executive sees and can
  // work every lead at New, FLC, or SLC - there's no team split any more
  // (see lead-service.ts's TIER_TEAMMATE_CLAUSE). A freshly imported or
  // manually created batch shows up for the whole floor right away, however
  // it was created. New/FLC/SLC share one merged queue (not separate tabs) -
  // a lead just carries its own stage badge/label. Admin/Manager "just
  // checking in" on the queue still default to FLC only, same as before -
  // this is specifically about the call_center role.
  const myTierStages = user?.role === "call_center" ? [NEW_STAGE, FLC_STAGE, SLC_STAGE] : [FLC_STAGE];
  const myTierLabel = myTierStages.map((stage) => TIER_LABELS[stage] ?? stage).join(" / ");
  // Two separate stages shown as two sections - a lead vanishing from view
  // the instant it's marked Qualified left no place to ever click Send to
  // Field Sales, so both stages of this agent's own queue are fetched. The
  // "Qualified" fetch is naturally empty for an FLC user (qualifyLead only
  // ever runs from SLC, and never changes owner), so this stays correct for
  // every tier without branching on which one this is.
  const [callingLeads, setCallingLeads] = useState<Lead[]>([]);
  const [qualifiedLeads, setQualifiedLeads] = useState<Lead[]>([]);
  // Leads this person used to own and has since handed onward - to Field
  // Sales (SLC's own Qualified -> Send to Field), or to the next calling
  // tier (FLC -> SLC) - both use the same shareLeadBackToSender grant, so
  // one fetch covers every hand-off type. Without this, the
  // queue going empty read as the work having vanished rather than finished
  // (see leadApi.listHandedOffLeads's own comment). Read-only: renderRow
  // hides the inline Call button for these.
  const [handedOffLeads, setHandedOffLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [callingLeadId, setCallingLeadId] = useState<string | null>(null);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [editDrawerOpen, setEditDrawerOpen] = useState(false);
  const [addLeadOpen, setAddLeadOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  // Client-side only, not sent to the server - the queue is already fully
  // loaded (listAllLeadsForStatus loops through every page up front), so
  // re-fetching per keystroke would just be slower for no benefit. Reuses
  // the exact same AdvancedFilters shape (and the same LeadFilters popover)
  // the main Leads page already has - client-confirmed: Search + Date was a
  // good start, but Category/Stage/Source needed to be here too, not just
  // there.
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<AdvancedFilters>({});

  const load = () => {
    setLoading(true);
    // One request for every tier stage together (status accepts a
    // comma-separated list server-side now) instead of one full paginated
    // fetch per stage - New+FLC+SLC used to mean 3 separate round-trip
    // loops for what's really one logical "my calling queue" fetch.
    // allSettled, not all - a slow/failed network hiccup on one of these
    // (e.g. the handed-off history, rarely needed urgently) must never blank
    // out the other two that did load; each failure degrades gracefully to
    // "couldn't load this part" instead of the whole queue vanishing.
    Promise.allSettled([
      leadApi.listAllLeadsForStatus({ status: myTierStages.join(",") }),
      leadApi.listAllLeadsForStatus({ status: "Qualified" }),
      leadApi.listHandedOffLeads(),
    ]).then(([callCenterResult, qualifiedResult, handedOffResult]) => {
      // status alone can't tell "I still own this" apart from "I used to
      // own this" - sendToField never changes status (see
      // lead-call-center-service.ts's own comment on that), so a leftover
      // lead_shares grant on an already-handed-off lead that happens to
      // still read "Qualified" would otherwise show up here too, with its
      // full Call button, duplicating (and contradicting) its real place
      // in "Already sent" below. inOwnerScope is the real signal.
      //
      // Sorted by creation time (newest first, same convention as the main
      // Leads page), never left as "every New lead, then every FLC lead,
      // then every SLC lead" - that ordering was the actual bug client-
      // confirmed as "very important": clicking Start FLC/Escalate to SLC
      // moved a lead's own stage-group fetch to a different position in
      // the array, so the row visibly jumped to a whole different part of
      // the list the instant its stage changed, even though nothing about
      // when it was created ever moved. Sorting the merged list by a
      // stage-independent key means a lead's row stays exactly where it
      // was - only its stage badge and next-step button change.
      if (callCenterResult.status === "fulfilled") {
        setCallingLeads(
          callCenterResult.value
            .filter((l) => l.inOwnerScope)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        );
      } else {
        message.error("Couldn't load your awaiting leads - try refreshing");
      }
      if (qualifiedResult.status === "fulfilled") {
        setQualifiedLeads(qualifiedResult.value.filter((l) => l.inOwnerScope));
      } else {
        message.error("Couldn't load your Qualified leads - try refreshing");
      }
      if (handedOffResult.status === "fulfilled") {
        setHandedOffLeads(handedOffResult.value);
      } else {
        message.error("Couldn't load your handed-off leads - try refreshing");
      }
      setLoading(false);
    });
  };

  useEffect(load, []);
  const leads = [...callingLeads, ...qualifiedLeads, ...handedOffLeads];
  // Derived, not stored - once a lead leaves this agent's queue entirely
  // (sent to field, no longer theirs), it drops out of `leads` on the next
  // reload and this naturally resolves to undefined, which closes the
  // detail drawer instead of leaving it showing a stale, no-longer-owned
  // lead. Looked up against the unfiltered list, not the filtered one below -
  // narrowing the search/date filter while a lead's detail drawer is already
  // open must never close it out from under the agent.
  const selectedLead = leads.find((l) => l.id === selectedLeadId);

  const matchesQueueFilters = (lead: Lead) => {
    const q = search.trim().toLowerCase();
    if (q) {
      const haystack = [lead.fullName, lead.phone, lead.email, lead.pincode].map((v) => (v ?? "").toLowerCase());
      if (!haystack.some((v) => v.includes(q))) return false;
    }
    if (filters.category && lead.category !== filters.category) return false;
    if (filters.status && lead.status !== filters.status) return false;
    if (filters.source && lead.source !== filters.source) return false;
    if (filters.createdFrom || filters.createdTo) {
      const created = dayjs(lead.createdAt);
      if (filters.createdFrom && created.isBefore(dayjs(filters.createdFrom).startOf("day"))) return false;
      if (filters.createdTo && created.isAfter(dayjs(filters.createdTo).endOf("day"))) return false;
    }
    return true;
  };

  const filteredQualified = useMemo(() => qualifiedLeads.filter(matchesQueueFilters), [qualifiedLeads, search, filters]);
  const filteredCalling = useMemo(() => callingLeads.filter(matchesQueueFilters), [callingLeads, search, filters]);
  const filteredHandedOff = useMemo(() => handedOffLeads.filter(matchesQueueFilters), [handedOffLeads, search, filters]);
  const hasActiveFilters = search.trim() !== "" || Object.values(filters).some((v) => v !== undefined && v !== false);
  const filteredTotal = filteredQualified.length + filteredCalling.length + filteredHandedOff.length;

  // Real pagination, not an unbounded list - rendering 200+ full row cards
  // (avatar, tags, buttons) at once was the actual source of the felt
  // slowness client-reported, not the fetch itself. Each section pages
  // independently since they're logically separate lists. Resets to page 1
  // whenever the visible set changes shape, so narrowing a filter never
  // leaves the view stranded on a now-nonexistent later page.
  const QUEUE_PAGE_SIZE = 10;
  const [qualifiedPage, setQualifiedPage] = useState(1);
  const [callingPage, setCallingPage] = useState(1);
  const [handedOffPage, setHandedOffPage] = useState(1);
  useEffect(() => {
    setQualifiedPage(1);
    setCallingPage(1);
    setHandedOffPage(1);
  }, [search, filters]);
  const pagedQualified = filteredQualified.slice((qualifiedPage - 1) * QUEUE_PAGE_SIZE, qualifiedPage * QUEUE_PAGE_SIZE);
  const pagedCalling = filteredCalling.slice((callingPage - 1) * QUEUE_PAGE_SIZE, callingPage * QUEUE_PAGE_SIZE);
  const pagedHandedOff = filteredHandedOff.slice((handedOffPage - 1) * QUEUE_PAGE_SIZE, handedOffPage * QUEUE_PAGE_SIZE);

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
  const renderRow = (lead: Lead, options?: { showCallButton?: boolean; showStageTag?: boolean }) => (
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
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Text strong style={{ fontSize: 14 }}>
              {lead.fullName}
            </Text>
            {options?.showStageTag && (
              <Tag color={LEAD_STATUS_COLORS[lead.status] ?? "default"} style={{ margin: 0, fontSize: 10 }}>
                {TIER_LABELS[lead.status] ?? lead.status}
              </Tag>
            )}
            <DuplicateLeadTag lead={lead} compact />
          </div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {[lead.phone, lead.pincode ? `PIN ${lead.pincode}` : "no pincode yet", lead.category, `Owner: ${lead.ownerName ?? "Unassigned"}`]
              .filter(Boolean)
              .join(" · ")}
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
    <div style={{ display: "flex", flexDirection: "column", gap: 14, height: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", flexShrink: 0 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Input
            placeholder="Search name, phone, email, or pincode"
            prefix={<SearchOutlined style={{ color: appTokens.textTertiary }} />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            allowClear
            style={{ width: 260 }}
          />
          <LeadFilters value={filters} onChange={setFilters} />
        </div>
        {(canAddToQueue || canBulkImport) && (
          <div style={{ display: "flex", gap: 8 }}>
            {canBulkImport && <Button onClick={() => setImportOpen(true)}>Import</Button>}
            {canAddToQueue && (
              <Button type="primary" icon={<PlusOutlined />} onClick={() => setAddLeadOpen(true)}>
                Add lead
              </Button>
            )}
          </div>
        )}
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
      {loading && leads.length === 0 && <Text type="secondary">Loading your queue...</Text>}

      {!loading && leads.length === 0 && (
        <div style={{ padding: "40px 0", textAlign: "center" }}>
          <Text type="secondary" style={{ fontSize: 13.5 }}>
            Nothing in your queue right now - new marketing leads will land here automatically
            {canAddToQueue && ', or use "Add lead" above for someone who called in directly'}.
          </Text>
        </div>
      )}

      {!loading && leads.length > 0 && hasActiveFilters && filteredTotal === 0 && (
        <div style={{ padding: "40px 0", textAlign: "center" }}>
          <Text type="secondary" style={{ fontSize: 13.5, display: "block", marginBottom: 10 }}>
            No leads match your search or filters.
          </Text>
          <Button
            size="small"
            onClick={() => {
              setSearch("");
              setFilters({});
            }}
          >
            Clear filters
          </Button>
        </div>
      )}

      {filteredQualified.length > 0 && (
        <div style={{ marginBottom: 18, paddingBottom: 14, borderBottom: `1px solid ${appTokens.borderLight}` }}>
          <Text strong style={{ fontSize: 12.5, color: appTokens.textTertiary, textTransform: "uppercase", letterSpacing: 0.3 }}>
            Qualified - ready for Field Sales ({filteredQualified.length})
          </Text>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
            {pagedQualified.map((l) => renderRow(l))}
          </div>
          {filteredQualified.length > 0 && (
            <div style={{ display: "flex", justifyContent: "center", paddingTop: 12 }}>
              <Pagination
                current={qualifiedPage}
                pageSize={QUEUE_PAGE_SIZE}
                total={filteredQualified.length}
                onChange={setQualifiedPage}
                showSizeChanger={false}
              />
            </div>
          )}
        </div>
      )}
      {filteredCalling.length > 0 && (
        <div style={{ marginBottom: 18, paddingBottom: 14, borderBottom: `1px solid ${appTokens.borderLight}` }}>
          <Text strong style={{ fontSize: 12.5, color: appTokens.textTertiary, textTransform: "uppercase", letterSpacing: 0.3 }}>
            Awaiting {myTierLabel} ({filteredCalling.length})
          </Text>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
            {pagedCalling.map((l) => renderRow(l, { showStageTag: myTierStages.length > 1 }))}
          </div>
          {filteredCalling.length > 0 && (
            <div style={{ display: "flex", justifyContent: "center", paddingTop: 12 }}>
              <Pagination
                current={callingPage}
                pageSize={QUEUE_PAGE_SIZE}
                total={filteredCalling.length}
                onChange={setCallingPage}
                showSizeChanger={false}
              />
            </div>
          )}
        </div>
      )}
      {filteredHandedOff.length > 0 && (
        <div>
          <Text strong style={{ fontSize: 12.5, color: appTokens.textTertiary, textTransform: "uppercase", letterSpacing: 0.3 }}>
            Already handed off ({filteredHandedOff.length})
          </Text>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
            {pagedHandedOff.map((l) => renderRow(l, { showCallButton: false }))}
          </div>
          {filteredHandedOff.length > 0 && (
            <div style={{ display: "flex", justifyContent: "center", paddingTop: 12 }}>
              <Pagination
                current={handedOffPage}
                pageSize={QUEUE_PAGE_SIZE}
                total={filteredHandedOff.length}
                onChange={setHandedOffPage}
                showSizeChanger={false}
              />
            </div>
          )}
        </div>
      )}
      </div>

      <AddLeadModal open={addLeadOpen} onClose={() => setAddLeadOpen(false)} onAdded={() => { setAddLeadOpen(false); load(); }} />

      <ImportLeadsModal open={importOpen} onClose={() => setImportOpen(false)} onImported={() => { setImportOpen(false); load(); }} />

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
