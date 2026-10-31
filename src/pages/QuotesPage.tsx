import { useEffect, useMemo, useRef, useState } from "react";
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
  const [streamProgress, setStreamProgress] = useState<{ loaded: number; total: number } | null>(null);
  const [search, setSearch] = useState("");
  const [newQuoteOpen, setNewQuoteOpen] = useState(false);
  const [openQuoteId, setOpenQuoteId] = useState<string | null>(null);

  // Same race-guard as OpportunitiesPage's own multi-page load - only the
  // most recently started load's progress callbacks are allowed to touch
  // state, so a stale in-flight fetch can't overwrite newer data.
  const loadTokenRef = useRef(0);

  const load = () => {
    const token = ++loadTokenRef.current;
    setLoading(true);
    setStreamProgress(null);
    quoteApi
      .listAllQuotes((loadedSoFar, total) => {
        if (loadTokenRef.current !== token) return;
        setQuotes(loadedSoFar);
        setLoading(false);
        setStreamProgress(loadedSoFar.length < total ? { loaded: loadedSoFar.length, total } : null);
      })
      .catch(() => {
        if (loadTokenRef.current === token) message.error("Failed to load quotes");
      })
      .finally(() => {
        if (loadTokenRef.current === token) setLoading(false);
      });
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
              animation: "quote-stream-spin 0.7s linear infinite",
            }}
          />
          <Text style={{ fontSize: 12.5, color: appTokens.textSecondary, flexShrink: 0 }}>
            Loading the rest of the quotes - {streamProgress.loaded.toLocaleString()} of {streamProgress.total.toLocaleString()}
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
          <style>{"@keyframes quote-stream-spin { to { transform: rotate(360deg); } }"}</style>
        </div>
      )}

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
