import { useEffect, useMemo, useState } from "react";
import { App, Button, Input, Switch, Table, Tag, Typography } from "antd";
import { PlusOutlined, SearchOutlined } from "@ant-design/icons";
import * as supportTicketApi from "../api/support-ticket-api";
import type { SupportTicket } from "../types/support-ticket";
import { useHasPermission } from "../hooks/use-permission";
import { useAuth } from "../context/AuthContext";
import { formatDate } from "../utils/lead-format";
import { appTokens } from "../utils/design-system";
import { PRIORITY_COLORS, STATUS_COLORS } from "../components/support-tickets/support-ticket-constants";
import { NewSupportTicketModal } from "../components/support-tickets/NewSupportTicketModal";
import { SupportTicketDetailDrawer } from "../components/support-tickets/SupportTicketDetailDrawer";

const { Title, Text } = Typography;

export default function SupportTicketsPage() {
  const { message } = App.useApp();
  const hasPermission = useHasPermission();
  const { user } = useAuth();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [mineOnly, setMineOnly] = useState(false);
  const [newTicketOpen, setNewTicketOpen] = useState(false);
  const [openTicketId, setOpenTicketId] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    supportTicketApi
      .listSupportTickets()
      .then((result) => setTickets(result.supportTickets))
      .catch(() => message.error("Failed to load support tickets"))
      .finally(() => setLoading(false));
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

  // Real counts from the tickets already loaded - no fabricated SLA/overdue
  // figures, just what's genuinely knowable from status alone today.
  const stats = useMemo(() => {
    const open = tickets.filter((t) => t.status === "Open" || t.status === "Replied").length;
    const resolved = tickets.filter((t) => t.status === "Resolved" || t.status === "Closed").length;
    const urgent = tickets.filter((t) => (t.status === "Open" || t.status === "Replied") && t.priority === "Urgent").length;
    return { total: tickets.length, open, resolved, urgent };
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

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
        {[
          { label: "Total tickets", value: String(stats.total), subtitle: "all time" },
          { label: "Open", value: String(stats.open), subtitle: "awaiting resolution" },
          { label: "Urgent & open", value: String(stats.urgent), subtitle: "needs attention first" },
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
          onRow={(record) => ({ onClick: () => setOpenTicketId(record.id), style: { cursor: "pointer" } })}
          className="thin-scroll-table table-row-hover"
          locale={{ emptyText: loading ? " " : "No tickets yet - raise one from the button above" }}
          columns={[
            {
              title: "Ticket",
              key: "ticket",
              render: (_, t) => (
                <Text strong style={{ color: appTokens.textPrimary }}>
                  {t.frappeTicketName ? `#${t.frappeTicketName}` : "—"}
                </Text>
              ),
            },
            {
              title: "Issue",
              key: "issue",
              render: (_, t) => <Text style={{ color: appTokens.textPrimary }}>{t.subject}</Text>,
            },
            { title: "Customer", key: "customer", render: (_, t) => t.leadFullName ?? <Text type="secondary">—</Text> },
            {
              title: "Priority",
              key: "priority",
              render: (_, t) => (
                <Tag color={PRIORITY_COLORS[t.priority] ?? "default"} style={{ margin: 0 }}>
                  {t.priority}
                </Tag>
              ),
            },
            {
              title: "Status",
              key: "status",
              render: (_, t) => (
                <Tag color={STATUS_COLORS[t.status] ?? "default"} style={{ margin: 0 }}>
                  {t.status}
                </Tag>
              ),
            },
            { title: "Raised", key: "date", render: (_, t) => formatDate(t.createdAt) },
            { title: "By", key: "createdBy", render: (_, t) => t.createdByName ?? "—" },
            {
              title: "Assignee",
              key: "assignee",
              render: (_, t) => t.assignedToName ?? <Text type="secondary">Unassigned</Text>,
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
