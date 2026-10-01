import { useEffect, useMemo, useState } from "react";
import { App, Button, Input, Table, Tag, Typography } from "antd";
import { PlusOutlined, SearchOutlined } from "@ant-design/icons";
import * as quoteApi from "../api/quote-api";
import type { QuoteListItem } from "../types/quote";
import { useHasPermission } from "../hooks/use-permission";
import { formatDate } from "../utils/lead-format";
import { appTokens } from "../utils/design-system";
import { QUOTE_STATUS_COLORS, QUOTE_STATUS_LABELS } from "../components/quotes/quote-constants";
import { NewQuoteModal } from "../components/quotes/NewQuoteModal";
import { QuoteDetailDrawer } from "../components/quotes/QuoteDetailDrawer";

const { Title, Text } = Typography;

export default function QuotesPage() {
  const { message } = App.useApp();
  const hasPermission = useHasPermission();
  const [quotes, setQuotes] = useState<QuoteListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [newQuoteOpen, setNewQuoteOpen] = useState(false);
  const [openQuoteId, setOpenQuoteId] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    quoteApi
      .listQuotes()
      .then((result) => setQuotes(result.quotes))
      .catch(() => message.error("Failed to load quotes"))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return quotes;
    return quotes.filter(
      (quote) =>
        quote.quoteLabel.toLowerCase().includes(q) ||
        quote.leadFullName.toLowerCase().includes(q) ||
        (quote.opportunityName ?? "").toLowerCase().includes(q)
    );
  }, [quotes, search]);

  const stats = useMemo(() => {
    const totalValue = quotes.reduce((sum, q) => sum + q.grandTotal, 0);
    const accepted = quotes.filter((q) => q.status === "accepted");
    return {
      total: quotes.length,
      sent: quotes.filter((q) => q.status === "sent").length,
      acceptedValue: accepted.reduce((sum, q) => sum + q.grandTotal, 0),
      totalValue,
    };
  }, [quotes]);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
        <div>
          <Title level={3} style={{ margin: 0, letterSpacing: -0.3, color: appTokens.textPrimary }}>
            Quotes
          </Title>
          <Text style={{ color: appTokens.textSecondary, fontSize: 13.5 }}>
            {quotes.length} quote{quotes.length === 1 ? "" : "s"} · Priced against a lead's opportunity, versioned on every change
          </Text>
        </div>
        {hasPermission("quotes.create") && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setNewQuoteOpen(true)}>
            New quote
          </Button>
        )}
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
        {[
          { label: "Total quotes", value: String(stats.total), subtitle: "all time" },
          { label: "Awaiting response", value: String(stats.sent), subtitle: "sent, not yet answered" },
          { label: "Accepted value", value: `₹${(stats.acceptedValue / 100000).toFixed(1)}L`, subtitle: "won quotes" },
          { label: "Total quoted", value: `₹${(stats.totalValue / 100000).toFixed(1)}L`, subtitle: "across every quote" },
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
            <Text style={{ fontSize: 11.5, fontWeight: 600, color: appTokens.textTertiary, display: "block" }}>{stat.label}</Text>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 1 }}>
              <span style={{ fontSize: 19, fontWeight: 700, color: appTokens.textPrimary, letterSpacing: -0.3 }}>{stat.value}</span>
              <Text style={{ fontSize: 11, color: appTokens.textTertiary }}>{stat.subtitle}</Text>
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
        <div style={{ padding: 14, borderBottom: `1px solid ${appTokens.borderLight}` }}>
          <Input
            placeholder="Search quote number, lead, or opportunity"
            prefix={<SearchOutlined style={{ color: appTokens.textTertiary }} />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            allowClear
            style={{ maxWidth: 360 }}
          />
        </div>

        <Table<QuoteListItem>
          rowKey="id"
          loading={loading}
          dataSource={filtered}
          pagination={filtered.length > 20 ? { pageSize: 20 } : false}
          onRow={(record) => ({ onClick: () => setOpenQuoteId(record.id), style: { cursor: "pointer" } })}
          className="thin-scroll-table table-row-hover"
          locale={{ emptyText: loading ? " " : "No quotes yet - create one from a lead's opportunity" }}
          columns={[
            {
              title: "Quote",
              key: "quote",
              render: (_, q) => (
                <Text strong style={{ color: appTokens.textPrimary }}>
                  {q.quoteLabel}
                </Text>
              ),
            },
            { title: "Lead", key: "lead", render: (_, q) => q.leadFullName },
            {
              title: "Opportunity",
              key: "opportunity",
              render: (_, q) => q.opportunityName ?? <Text type="secondary">—</Text>,
            },
            {
              title: "Status",
              key: "status",
              render: (_, q) => (
                <Tag color={QUOTE_STATUS_COLORS[q.status]} style={{ margin: 0 }}>
                  {QUOTE_STATUS_LABELS[q.status]}
                </Tag>
              ),
            },
            {
              title: "Total",
              key: "total",
              align: "right" as const,
              render: (_, q) => (
                <Text strong style={{ color: appTokens.textPrimary }}>
                  {new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(q.grandTotal)}
                </Text>
              ),
            },
            { title: "Date", key: "date", render: (_, q) => formatDate(q.createdAt) },
            { title: "By", key: "createdBy", render: (_, q) => q.createdByName ?? "—" },
          ]}
        />
      </div>

      <NewQuoteModal
        open={newQuoteOpen}
        onClose={() => setNewQuoteOpen(false)}
        onCreated={(detail) => {
          setNewQuoteOpen(false);
          load();
          setOpenQuoteId(detail.quote.id);
        }}
      />

      <QuoteDetailDrawer quoteId={openQuoteId} onClose={() => setOpenQuoteId(null)} onChanged={load} />
    </div>
  );
}
