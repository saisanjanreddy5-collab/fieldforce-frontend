import { useEffect, useMemo, useRef, useState } from "react";
import { App, Button, DatePicker, Empty, Input, Segmented, Select, Table, Tag, Typography } from "antd";
import type { SorterResult } from "antd/es/table/interface";
import { PlusOutlined, SearchOutlined } from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";
import * as quoteApi from "../api/quote-api";
import type { QuoteListItem, QuoteStatus } from "../types/quote";
import { useHasPermission } from "../hooks/use-permission";
import { formatDate, formatWholeCurrency } from "../utils/lead-format";
import { appTokens } from "../utils/design-system";
import { StatsRow } from "../components/StatsRow";
import { ListPagination } from "../components/ListPagination";
import { usePagination } from "../hooks/use-pagination";
import { QUOTE_STATUS_COLORS, QUOTE_STATUS_LABELS, QUOTE_STATUS_OPTIONS } from "../components/quotes/quote-constants";
import { NewQuoteModal } from "../components/quotes/NewQuoteModal";
import { QuoteDetailDrawer } from "../components/quotes/QuoteDetailDrawer";
import { useIsMobile } from "../hooks/use-is-mobile";

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
// Same small grey dot the Opportunities page puts in front of each filter.
const FILTER_DOT = <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: "#9aa2b1" }} />;

type DatePreset = "any" | "today" | "7d" | "30d" | "month" | "quarter" | "custom";
const DATE_PRESETS: { value: DatePreset; label: string }[] = [
  { value: "any", label: "Any date" },
  { value: "today", label: "Today" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "month", label: "This month" },
  { value: "quarter", label: "This quarter" },
  { value: "custom", label: "Custom range…" },
];

type ValueBand = "any" | "lt1l" | "1to5l" | "5to25l" | "gt25l";
const VALUE_BANDS: { value: ValueBand; label: string; min?: number; max?: number }[] = [
  { value: "any", label: "Any value" },
  { value: "lt1l", label: "Under ₹1L", max: 100_000 },
  { value: "1to5l", label: "₹1L – ₹5L", min: 100_000, max: 500_000 },
  { value: "5to25l", label: "₹5L – ₹25L", min: 500_000, max: 2_500_000 },
  { value: "gt25l", label: "Over ₹25L", min: 2_500_000 },
];

function presetRange(preset: DatePreset, custom: [Dayjs, Dayjs] | null): [Dayjs, Dayjs] | null {
  const now = dayjs();
  switch (preset) {
    case "today": return [now.startOf("day"), now.endOf("day")];
    case "7d": return [now.subtract(6, "day").startOf("day"), now.endOf("day")];
    case "30d": return [now.subtract(29, "day").startOf("day"), now.endOf("day")];
    case "month": return [now.startOf("month"), now.endOf("day")];
    case "quarter": {
      const qStartMonth = Math.floor(now.month() / 3) * 3;
      return [now.month(qStartMonth).startOf("month"), now.endOf("day")];
    }
    case "custom": return custom ? [custom[0].startOf("day"), custom[1].endOf("day")] : null;
    default: return null;
  }
}

export default function QuotesPage() {
  const { message } = App.useApp();
  const hasPermission = useHasPermission();
  const isMobile = useIsMobile();
  const [quotes, setQuotes] = useState<QuoteListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [streamProgress, setStreamProgress] = useState<{ loaded: number; total: number } | null>(null);
  const [newQuoteOpen, setNewQuoteOpen] = useState(false);
  const [openQuoteId, setOpenQuoteId] = useState<string | null>(null);

  // ---- filters (all client-side: every quote is already loaded above) ----
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<QuoteStatus | "all">("all");
  const [ownerFilter, setOwnerFilter] = useState<string | undefined>();
  const [categoryFilter, setCategoryFilter] = useState<string | undefined>();
  const [datePreset, setDatePreset] = useState<DatePreset>("any");
  const [customRange, setCustomRange] = useState<[Dayjs, Dayjs] | null>(null);
  const [valueBand, setValueBand] = useState<ValueBand>("any");
  const [sort, setSort] = useState<{ key: "total" | "date"; order: "ascend" | "descend" } | null>(null);
  // Same rule as the Opportunities page: only someone who can see other
  // users gets a Salesperson filter (a Field Sales user only sees their own).
  const canFilterByPerson = hasPermission("users.view");

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

  // Options come from the quotes themselves, so a filter never offers a
  // person or category that would just return nothing.
  const ownerOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const q of quotes) if (q.ownerId) seen.set(q.ownerId, q.ownerName ?? "Unknown");
    return [...seen].map(([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label));
  }, [quotes]);
  const categoryOptions = useMemo(
    () => [...new Set(quotes.map((q) => q.leadCategory).filter((c): c is string => Boolean(c)))].sort().map((c) => ({ value: c, label: c })),
    [quotes]
  );

  const range = useMemo(() => presetRange(datePreset, customRange), [datePreset, customRange]);
  const band = VALUE_BANDS.find((b) => b.value === valueBand)!;

  // Everything except Status - so each status tab can show how many quotes
  // it would have with the other filters applied.
  const matchesNonStatus = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (quote: QuoteListItem) => {
      if (q) {
        const hay = [quote.quoteLabel, quote.leadFullName, quote.opportunityName ?? "", quote.ownerName ?? "", quote.createdByName ?? ""].join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (ownerFilter && quote.ownerId !== ownerFilter) return false;
      if (categoryFilter && quote.leadCategory !== categoryFilter) return false;
      if (range) {
        const created = dayjs(quote.createdAt);
        if (created.isBefore(range[0]) || created.isAfter(range[1])) return false;
      }
      if (band.min !== undefined && quote.grandTotal < band.min) return false;
      if (band.max !== undefined && quote.grandTotal >= band.max) return false;
      return true;
    };
  }, [search, ownerFilter, categoryFilter, range, band]);

  const beforeStatus = useMemo(() => quotes.filter(matchesNonStatus), [quotes, matchesNonStatus]);
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: beforeStatus.length };
    for (const q of beforeStatus) counts[q.status] = (counts[q.status] ?? 0) + 1;
    return counts;
  }, [beforeStatus]);

  const filtered = useMemo(() => {
    const list = statusFilter === "all" ? beforeStatus : beforeStatus.filter((q) => q.status === statusFilter);
    if (!sort) return list;
    const dir = sort.order === "ascend" ? 1 : -1;
    return [...list].sort((a, b) =>
      sort.key === "total" ? (a.grandTotal - b.grandTotal) * dir : (dayjs(a.createdAt).valueOf() - dayjs(b.createdAt).valueOf()) * dir
    );
  }, [beforeStatus, statusFilter, sort]);
  // Paged outside antd Table, so the pager is an always-visible footer
  // instead of inline with the table rows (see the Table wrapper below).
  const pager = usePagination("quotes", 20, filtered.length);

  const filtersActive =
    search.trim() !== "" || statusFilter !== "all" || !!ownerFilter || !!categoryFilter || datePreset !== "any" || valueBand !== "any";

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setOwnerFilter(undefined);
    setCategoryFilter(undefined);
    setDatePreset("any");
    setCustomRange(null);
    setValueBand("any");
    pager.setPage(1);
  };

  // Any filter change goes back to page 1, so you never land on an empty page.
  useEffect(() => pager.setPage(1), [pager.setPage, search, statusFilter, ownerFilter, categoryFilter, datePreset, customRange, valueBand]);

  // Headline numbers follow what's on screen.
  const stats = useMemo(() => {
    const totalValue = filtered.reduce((sum, q) => sum + q.grandTotal, 0);
    const accepted = filtered.filter((q) => q.status === "accepted");
    return {
      total: filtered.length,
      sent: filtered.filter((q) => q.status === "sent").length,
      acceptedValue: accepted.reduce((sum, q) => sum + q.grandTotal, 0),
      totalValue,
    };
  }, [filtered]);
  const scope = filtersActive ? "in this view" : "all time";

  return (
    <div className="page-fill-height" style={{ height: "100%", display: "flex", flexDirection: "column" }}>
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

      <div style={{ marginBottom: 12 }}>
        <StatsRow
          stats={[
            { label: "Total quotes", value: String(stats.total), subtitle: scope },
            { label: "Awaiting response", value: String(stats.sent), subtitle: "sent, not yet answered" },
            { label: "Accepted value", value: `₹${(stats.acceptedValue / 100000).toFixed(1)}L`, subtitle: "won quotes" },
            { label: "Total quoted", value: `₹${(stats.totalValue / 100000).toFixed(1)}L`, subtitle: filtersActive ? "in this view" : "across every quote" },
          ]}
        />
      </div>

      <div
        style={{
          border: `1px solid ${appTokens.border}`,
          borderRadius: appTokens.radius,
          background: appTokens.surface,
          boxShadow: appTokens.shadowXs,
          overflow: "hidden",
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ padding: 14, borderBottom: `1px solid ${appTokens.borderLight}`, flexShrink: 0, display: "flex", flexDirection: "column", gap: 10 }}>
          {/* Status: one click, with how many quotes each would show. */}
          <div className="scrollbar-hidden" style={{ maxWidth: "100%", overflowX: "auto" }}>
            <Segmented
              value={statusFilter}
              onChange={(v) => setStatusFilter(v as QuoteStatus | "all")}
              options={[
                { value: "all", label: <StatusTab label="All" count={statusCounts.all ?? 0} /> },
                ...QUOTE_STATUS_OPTIONS.map((o) => ({
                  value: o.value,
                  label: <StatusTab label={o.label} count={statusCounts[o.value] ?? 0} color={QUOTE_STATUS_COLORS[o.value]} />,
                })),
              ]}
            />
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <Input
              placeholder="Search quote, lead, opportunity or person"
              prefix={<SearchOutlined style={{ color: appTokens.textTertiary }} />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              allowClear
              style={{ width: isMobile ? "100%" : 300 }}
            />
            {canFilterByPerson && (
              <Select
                prefix={FILTER_DOT}
                showSearch={{ optionFilterProp: "label" }}
                style={{ minWidth: 150, flexShrink: 0 }}
                value={ownerFilter ?? "all"}
                onChange={(v) => setOwnerFilter(v === "all" ? undefined : v)}
                options={[{ value: "all", label: "All salespersons" }, ...ownerOptions]}
              />
            )}
            {(categoryOptions.length > 0 || categoryFilter) && (
              <Select
                prefix={FILTER_DOT}
                style={{ minWidth: 130, flexShrink: 0 }}
                value={categoryFilter ?? "all"}
                onChange={(v) => setCategoryFilter(v === "all" ? undefined : v)}
                options={[{ value: "all", label: "All categories" }, ...categoryOptions]}
              />
            )}
            <Select
              prefix={FILTER_DOT}
              style={{ minWidth: 130, flexShrink: 0 }}
              value={datePreset}
              onChange={(v) => {
                setDatePreset(v);
                if (v !== "custom") setCustomRange(null);
              }}
              options={DATE_PRESETS}
            />
            {datePreset === "custom" && (
              <RangePicker
                value={customRange}
                onChange={(v) => setCustomRange(v && v[0] && v[1] ? [v[0], v[1]] : null)}
                format="DD MMM YYYY"
                disabledDate={(d) => d.isAfter(dayjs().endOf("day"))}
                allowClear
              />
            )}
            <Select
              prefix={FILTER_DOT}
              style={{ minWidth: 125, flexShrink: 0 }}
              value={valueBand}
              onChange={setValueBand}
              options={VALUE_BANDS.map(({ value, label }) => ({ value, label }))}
            />
            {filtersActive && (
              <Button type="link" onClick={clearFilters} style={{ paddingInline: 4 }}>
                Clear all
              </Button>
            )}
            {filtersActive && !loading && (
              <Text style={{ color: appTokens.textTertiary, fontSize: 12.5, marginLeft: isMobile ? 0 : "auto" }}>
                Showing {filtered.length} of {quotes.length}
              </Text>
            )}
          </div>
        </div>

        <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
        <Table<QuoteListItem>
          rowKey="id"
          loading={loading}
          dataSource={pager.slice(filtered)}
          pagination={false}
          // Scrolls sideways on a narrow screen instead of squeezing every
          // column until quote numbers break mid-code and Total is clipped.
          scroll={{ x: 900 }}
          onRow={(record) => ({ onClick: () => setOpenQuoteId(record.id), style: { cursor: "pointer" } })}
          onChange={(_p, _f, sorter) => {
            const s = sorter as SorterResult<QuoteListItem>;
            setSort(s.order && (s.columnKey === "total" || s.columnKey === "date") ? { key: s.columnKey, order: s.order } : null);
          }}
          className="thin-scroll-table table-row-hover"
          locale={{
            emptyText: loading ? (
              " "
            ) : filtersActive && quotes.length > 0 ? (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No quotes match these filters">
                <Button onClick={clearFilters}>Clear filters</Button>
              </Empty>
            ) : (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No quotes yet - create one from a lead's opportunity" />
            ),
          }}
          columns={[
            {
              title: "Quote",
              key: "quote",
              render: (_, q) => (
                <Text strong style={{ color: appTokens.textPrimary, whiteSpace: "nowrap" }}>
                  {q.quoteLabel}
                </Text>
              ),
            },
            {
              title: "Lead",
              key: "lead",
              render: (_, q) => (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  {q.leadFullName}
                  {q.leadCategory && (
                    <Tag color="blue" style={{ margin: 0, fontSize: 10.5, lineHeight: "16px", paddingInline: 5 }}>
                      {q.leadCategory}
                    </Tag>
                  )}
                </span>
              ),
            },
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
              sorter: true,
              sortOrder: sort?.key === "total" ? sort.order : null,
              render: (_, q) => (
                <Text strong style={{ color: appTokens.textPrimary, whiteSpace: "nowrap" }}>
                  {formatWholeCurrency(q.grandTotal)}
                </Text>
              ),
            },
            {
              title: "Date",
              key: "date",
              sorter: true,
              sortOrder: sort?.key === "date" ? sort.order : null,
              render: (_, q) => <span style={{ whiteSpace: "nowrap" }}>{formatDate(q.createdAt)}</span>,
            },
            { title: "Salesperson", key: "owner", render: (_, q) => q.ownerName ?? <Text type="secondary">Unassigned</Text> },
            { title: "Created by", key: "createdBy", render: (_, q) => q.createdByName ?? "—" },
          ]}
        />
        </div>

        {filtered.length > 0 && (
          <div style={{ padding: "12px 14px", flexShrink: 0, borderTop: `1px solid ${appTokens.borderLight}` }}>
            <ListPagination {...pager.props(filtered.length)} />
          </div>
        )}
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

function StatusTab({ label, count, color }: { label: string; count: number; color?: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, paddingInline: 2 }}>
      {color && <span style={{ width: 7, height: 7, borderRadius: "50%", background: color, flexShrink: 0 }} />}
      {label}
      <span style={{ fontSize: 11.5, color: appTokens.textTertiary, fontVariantNumeric: "tabular-nums" }}>{count}</span>
    </span>
  );
}
