import { useEffect, useMemo, useRef, useState } from "react";
import { App, Button, Input, Switch, Table, Tag, Typography } from "antd";
import { PlusOutlined, SearchOutlined } from "@ant-design/icons";
import * as supportTicketApi from "../api/support-ticket-api";
import type { SupportTicket } from "../types/support-ticket";
import { useHasPermission } from "../hooks/use-permission";
import { useAuth } from "../context/AuthContext";
import { formatDate } from "../utils/lead-format";
import { appTokens } from "../utils/design-system";
import { PRIORITY_COLORS, STATUS_COLORS, resolutionSlaTag } from "../components/support-tickets/support-ticket-constants";
import { NewSupportTicketModal } from "../components/support-tickets/NewSupportTicketModal";
import { SupportTicketDetailDrawer } from "../components/support-tickets/SupportTicketDetailDrawer";

const { Title, Text } = Typography;

export default function SupportTicketsPage() {
  const { message } = App.useApp();
  const hasPermission = useHasPermission();
  const { user } = useAuth();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [streamProgress, setStreamProgress] = useState<{ loaded: number; total: number } | null>(null);
  const [search, setSearch] = useState("");
  const [mineOnly, setMineOnly] = useState(false);
  const [newTicketOpen, setNewTicketOpen] = useState(false);
  const [openTicketId, setOpenTicketId] = useState<string | null>(null);

  // Same race-guard as OpportunitiesPage's own multi-page load - only the
  // most recently started load's progress callbacks are allowed to touch
  // state, so a stale in-flight fetch can't overwrite newer data.
  const loadTokenRef = useRef(0);

  const load = () => {
    const token = ++loadTokenRef.current;
    setLoading(true);
    setStreamProgress(null);
    supportTicketApi
      .listAllSupportTickets((loadedSoFar, total) => {
        if (loadTokenRef.current !== token) return;
        setTickets(loadedSoFar);
        setLoading(false);
        setStreamProgress(loadedSoFar.length < total ? { loaded: loadedSoFar.length, total } : null);
      })
      .catch(() => {
        if (loadTokenRef.current === token) message.error("Failed to load support tickets");
      })
      .finally(() => {
        if (loadTokenRef.current === token) setLoading(false);
      });
  };

  useEffect(load, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tickets.filter((t) => {
      if (mineOnly && t.assignedTo !== user?.id) return false;
      if (!q) return true;
      return (
        t.subject.toLowerCase().includes(q) ||
        (t.leadFullName ?? "").toLowerCase().includes(q) ||
        (t.frappeTicketName ?? "").toLowerCase().includes(q)
      );
    });
  }, [tickets, search, mineOnly, user?.id]);

  // Real counts from the tickets already loaded. overdue is a genuine SLA
  // breach (response or resolution deadline passed on a still-open ticket),
  // sourced from Frappe's own SLA policy, not estimated here.
  const stats = useMemo(() => {
    const open = tickets.filter((t) => t.status === "Open" || t.status === "Replied").length;
    const resolved = tickets.filter((t) => t.status === "Resolved" || t.status === "Closed").length;
    const urgent = tickets.filter((t) => (t.status === "Open" || t.status === "Replied") && t.priority === "Urgent").length;
    const overdue = tickets.filter((t) => t.responseBreached || t.resolutionBreached).length;
    return { total: tickets.length, open, resolved, urgent, overdue };
  }, [tickets]);

  if (!hasPermission("support_tickets.view")) {
    return (
      <div>
        <Title level={3}>Support tickets</Title>
        <Text type="secondary">You do not have permission to view support tickets.</Text>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
        <div>
          <Title level={3} style={{ margin: 0, letterSpacing: -0.3, color: appTokens.textPrimary }}>
            Support tickets
          </Title>
          <Text style={{ color: appTokens.textSecondary, fontSize: 13.5 }}>
            {tickets.length} ticket{tickets.length === 1 ? "" : "s"} · Every ticket is linked to a customer and backed by Frappe Helpdesk
          </Text>
        </div>
        {hasPermission("support_tickets.create") && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setNewTicketOpen(true)}>
            New ticket
          </Button>
        )}
      </div>

      {streamProgress && (
        <div
          style={{
            marginBottom: 10,
            padding: "8px 14px",
            borderRadius: appTokens.radius,
            background: appTokens.primarySoft,
            border: `1px solid ${appTokens.border}`,
            display: "flex",
            alignItems: "center",
            gap: 10,
            overflow: "hidden",
            position: "relative",
          }}
        >
          <span
            style={{
              width: 14,
              height: 14,
              borderRadius: "50%",
              border: `2px solid ${appTokens.primary}`,
              borderTopColor: "transparent",
              flexShrink: 0,
              animation: "ticket-stream-spin 0.7s linear infinite",
            }}
          />
          <Text style={{ fontSize: 12.5, color: appTokens.textSecondary, flexShrink: 0 }}>
            Loading the rest of the tickets - {streamProgress.loaded.toLocaleString()} of {streamProgress.total.toLocaleString()}
          </Text>
          <div style={{ flex: 1, height: 4, borderRadius: 999, background: appTokens.border, overflow: "hidden", minWidth: 60 }}>
            <div
              style={{
                height: "100%",
                borderRadius: 999,
                background: appTokens.primary,
                width: `${Math.min(100, (streamProgress.loaded / Math.max(1, streamProgress.total)) * 100)}%`,
                transition: "width 0.25s ease-out",
              }}
            />
          </div>
          <style>{"@keyframes ticket-stream-spin { to { transform: rotate(360deg); } }"}</style>
        </div>
      )}

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
        {[
          { label: "Total tickets", value: String(stats.total), subtitle: "all time" },
          { label: "Open", value: String(stats.open), subtitle: "awaiting resolution" },
          { label: "Urgent & open", value: String(stats.urgent), subtitle: "needs attention first" },
          { label: "SLA breached", value: String(stats.overdue), subtitle: "response or resolution overdue" },
          { label: "Resolved", value: String(stats.resolved), subtitle: "resolved or closed" },
        ].map((stat) => (
          <div
            key={stat.label}
            style={{
              flex: 1,
              minWidth: 170,
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

      <div
        style={{
          border: `1px solid ${appTokens.border}`,
          borderRadius: appTokens.radius,
          background: appTokens.surface,
          boxShadow: appTokens.shadowXs,
          overflow: "hidden",
        }}
      >
        <div style={{ padding: 14, borderBottom: `1px solid ${appTokens.borderLight}`, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <Input
            placeholder="Search ticket, customer, or subject"
            prefix={<SearchOutlined style={{ color: appTokens.textTertiary }} />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            allowClear
            style={{ maxWidth: 360 }}
          />
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Switch size="small" checked={mineOnly} onChange={setMineOnly} />
            <Text style={{ fontSize: 13 }}>My tickets</Text>
          </div>
        </div>

        <Table<SupportTicket>
          rowKey="id"
          loading={loading}
          dataSource={filtered}
          pagination={filtered.length > 20 ? { pageSize: 20 } : false}
          tableLayout="fixed"
          onRow={(record) => ({ onClick: () => setOpenTicketId(record.id), style: { cursor: "pointer" } })}
          className="thin-scroll-table table-row-hover"
          locale={{ emptyText: loading ? " " : "No tickets yet - raise one from the button above" }}
          columns={[
            {
              title: "Ticket",
              key: "ticket",
              width: "7%",
              render: (_, t) => (
                <Text strong style={{ color: appTokens.textPrimary, whiteSpace: "nowrap" }}>
                  {t.frappeTicketName ? `#${t.frappeTicketName}` : "—"}
                </Text>
              ),
            },
            {
              title: "Issue",
              key: "issue",
              width: "18%",
              render: (_, t) => (
                <Text style={{ color: appTokens.textPrimary, display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={t.subject}>
                  {t.subject}
                </Text>
              ),
            },
            {
              title: "Customer",
              key: "customer",
              width: "13%",
              render: (_, t) =>
                t.leadFullName ? (
                  <Text style={{ display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={t.leadFullName}>
                    {t.leadFullName}
                  </Text>
                ) : (
                  <Text type="secondary">—</Text>
                ),
            },
            {
              title: "Priority",
              key: "priority",
              width: "8%",
              render: (_, t) => (
                <Tag color={PRIORITY_COLORS[t.priority] ?? "default"} style={{ margin: 0, whiteSpace: "nowrap" }}>
                  {t.priority}
                </Tag>
              ),
            },
            {
              title: "Status",
              key: "status",
              width: "9%",
              render: (_, t) => (
                <Tag color={STATUS_COLORS[t.status] ?? "default"} style={{ margin: 0, whiteSpace: "nowrap" }}>
                  {t.status}
                </Tag>
              ),
            },
            {
              title: "SLA",
              key: "sla",
              width: "13%",
              render: (_, t) => {
                const tag = resolutionSlaTag(t);
                return tag ? (
                  <Tag color={tag.color} style={{ margin: 0, whiteSpace: "nowrap" }}>
                    {tag.label}
                  </Tag>
                ) : (
                  <Text type="secondary">—</Text>
                );
              },
            },
            {
              title: "Raised",
              key: "date",
              width: "10%",
              render: (_, t) => <Text style={{ whiteSpace: "nowrap" }}>{formatDate(t.createdAt)}</Text>,
            },
            {
              title: "By",
              key: "createdBy",
              width: "11%",
              render: (_, t) => (
                <Text style={{ display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={t.createdByName ?? undefined}>
                  {t.createdByName ?? "—"}
                </Text>
              ),
            },
            {
              title: "Assignee",
              key: "assignee",
              width: "11%",
              render: (_, t) => (
                <Text
                  type={t.assignedToName ? undefined : "secondary"}
                  style={{ display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
                  title={t.assignedToName ?? undefined}
                >
                  {t.assignedToName ?? "Unassigned"}
                </Text>
              ),
            },
          ]}
        />
      </div>

      <NewSupportTicketModal
        open={newTicketOpen}
        onClose={() => setNewTicketOpen(false)}
        onCreated={(ticket) => {
          setNewTicketOpen(false);
          load();
          setOpenTicketId(ticket.id);
        }}
      />

      <SupportTicketDetailDrawer ticketId={openTicketId} onClose={() => setOpenTicketId(null)} onChanged={load} />
    </div>
  );
}
