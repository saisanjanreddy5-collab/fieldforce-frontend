import { useEffect, useMemo, useState } from "react";
import { App, Button, Input, Table, Tag, Typography } from "antd";
import { PlusOutlined, SearchOutlined } from "@ant-design/icons";
import * as supportTicketApi from "../api/support-ticket-api";
import type { SupportTicket } from "../types/support-ticket";
import { useHasPermission } from "../hooks/use-permission";
import { formatDate } from "../utils/lead-format";
import { appTokens } from "../utils/design-system";
import { STATUS_COLORS } from "../components/support-tickets/support-ticket-constants";
import { NewSupportTicketModal } from "../components/support-tickets/NewSupportTicketModal";
import { SupportTicketDetailDrawer } from "../components/support-tickets/SupportTicketDetailDrawer";

const { Title, Text } = Typography;

export default function SupportTicketsPage() {
  const { message } = App.useApp();
  const hasPermission = useHasPermission();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
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
    if (!q) return tickets;
    return tickets.filter(
      (t) =>
        t.subject.toLowerCase().includes(q) ||
        (t.leadFullName ?? "").toLowerCase().includes(q) ||
        (t.frappeTicketName ?? "").toLowerCase().includes(q)
    );
  }, [tickets, search]);

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

      <div
        style={{
          border: `1px solid ${appTokens.border}`,
          borderRadius: appTokens.radius,
          background: appTokens.surface,
          boxShadow: appTokens.shadowXs,
          overflow: "hidden",
        }}
      >
        <div style={{ padding: 14, borderBottom: `1px solid ${appTokens.borderLight}` }}>
          <Input
            placeholder="Search ticket, customer, or subject"
            prefix={<SearchOutlined style={{ color: appTokens.textTertiary }} />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            allowClear
            style={{ maxWidth: 360 }}
          />
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

      <SupportTicketDetailDrawer ticketId={openTicketId} onClose={() => setOpenTicketId(null)} />
    </div>
  );
}
