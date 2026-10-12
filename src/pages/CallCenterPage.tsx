import { useEffect, useMemo, useState } from "react";
import { App, Avatar, Button, Input, Table, Tag, Typography } from "antd";
import { PhoneOutlined, PlayCircleOutlined, SearchOutlined } from "@ant-design/icons";
import * as callCenterApi from "../api/call-center-api";
import * as smartfloApi from "../api/smartflo-api";
import type { Call } from "../types/call";
import { useHasPermission } from "../hooks/use-permission";
import { errorMessageFrom } from "../utils/api-error";
import { avatarGradient, appTokens } from "../utils/design-system";
import { formatDate, formatDurationSeconds, formatFollowUpDate, initials } from "../utils/lead-format";

const { Title, Text } = Typography;

export default function CallCenterPage() {
  const { message } = App.useApp();
  const hasPermission = useHasPermission();
  const [calls, setCalls] = useState<Call[]>([]);
  const [queue, setQueue] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [callingLeadId, setCallingLeadId] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    Promise.all([callCenterApi.listCalls(), callCenterApi.listUpcomingCalls()])
      .then(([log, upcoming]) => {
        setCalls(log.calls);
        setQueue(upcoming);
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

  // Every figure here is arithmetic on calls/queue already loaded - nothing
  // modeled or estimated. Outcome/recordingUrl/durationSeconds are written
  // by the real Smartflo webhook (see smartflo-service.ts); dueDate on a
  // queued call comes from whoever scheduled it via Activity Calendar.
  const stats = useMemo(() => {
    const today = new Date().toDateString();
    const callsToday = calls.filter((c) => new Date(c.createdAt).toDateString() === today).length;
    const connected = calls.filter((c) => c.outcome?.startsWith("Connected")).length;
    const connectedPercent = calls.length > 0 ? Math.round((connected / calls.length) * 100) : 0;
    const withDuration = calls.filter((c) => c.durationSeconds !== null);
    const avgHandleSeconds =
      withDuration.length > 0 ? Math.round(withDuration.reduce((sum, c) => sum + (c.durationSeconds ?? 0), 0) / withDuration.length) : null;
    const recorded = calls.filter((c) => c.recordingUrl).length;
    const recordedPercent = calls.length > 0 ? Math.round((recorded / calls.length) * 100) : 0;
    const overdueInQueue = queue.filter((c) => c.dueDate && new Date(c.dueDate).getTime() < Date.now()).length;
    return { callsToday, connectedPercent, avgHandleSeconds, inQueue: queue.length, overdueInQueue, recordedPercent };
  }, [calls, queue]);

  const handleCall = async (leadId: string | null) => {
    if (!leadId) return;
    setCallingLeadId(leadId);
    try {
      // By the time this resolves, smartflo-service.ts has already logged
      // the new call as an Activity - reload so it shows up right away (as
      // "In progress", until the webhook fills in the real outcome) instead
      // of only appearing after a manual page refresh.
      await smartfloApi.callLead(leadId);
      message.success("Calling now");
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

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
        <div>
          <Title level={3} style={{ margin: 0, letterSpacing: -0.3, color: appTokens.textPrimary }}>
            Call center
          </Title>
          <Text style={{ color: appTokens.textSecondary, fontSize: 13.5 }}>
            Every click-to-call made through Smartflo, written back to the lead automatically.
          </Text>
        </div>
      </div>

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
                      {c.leadPhone && (
                        <Text type="secondary" style={{ fontSize: 11, display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {c.leadPhone}
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
              Scheduled via Activity Calendar, not yet made
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
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
