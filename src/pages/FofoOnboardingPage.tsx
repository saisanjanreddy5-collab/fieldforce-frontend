import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Avatar, Input, Pagination, Space, Table, Tag, Typography, message } from "antd";
import { HourglassOutlined } from "@ant-design/icons";
import * as fofoApi from "../api/fofo-onboarding-api";
import type { FofoOnboardingListItem } from "../types/fofo-onboarding";
import { FofoHandoffDetail } from "../components/fofo/FofoHandoffDetail";
import { formatCompactCurrency, initials } from "../utils/lead-format";
import { appTokens, avatarGradient } from "../utils/design-system";
import { StatsRow } from "../components/StatsRow";

const { Title, Text } = Typography;

export default function FofoOnboardingPage() {
  const { leadId } = useParams<{ leadId?: string }>();

  if (leadId) {
    return <FofoHandoffDetail leadId={leadId} />;
  }

  return <FofoOnboardingList />;
}

type StatusFilter = "pushed" | "not_pushed" | null;

// Onboarding paperwork naturally takes longer than a sales deal to move,
// so this uses a longer threshold than the Opportunities pipeline's
// stalled-deal flag before calling a handoff out as stuck.
const STUCK_AFTER_DAYS = 14;

function daysSince(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
}

function FofoOnboardingList() {
  const navigate = useNavigate();
  const [items, setItems] = useState<FofoOnboardingListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [streamProgress, setStreamProgress] = useState<{ loaded: number; total: number } | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(null);
  // Pagination lifted out of antd Table's own internal/uncontrolled page
  // state - rendered as its own always-visible footer below a bounded,
  // internally-scrolling row area instead of inline with the table rows
  // (see the Table wrapper below - same pattern as QuotesPage/LeadQueue).
  const [page, setPage] = useState(1);
  // Onboarding handoffs are a narrower, lower-volume list than a lead/quote
  // queue by nature (one per FOFO-category lead that's reached "Onboard"),
  // so this uses a smaller page size than the 20 other modules use - sized
  // to this list's real shape, not copy-pasted from a bigger-volume module.
  const PAGE_SIZE = 8;

  useEffect(() => {
    setLoading(true);
    setStreamProgress(null);
    fofoApi
      .listAllFofoOnboardings((loadedSoFar, total) => {
        setItems(loadedSoFar);
        setLoading(false);
        setStreamProgress(loadedSoFar.length < total ? { loaded: loadedSoFar.length, total } : null);
      })
      .catch(() => message.error("Failed to load FOFO onboarding handoffs"))
      .finally(() => setLoading(false));
  }, []);

  const pushedCount = useMemo(() => items.filter((i) => i.pushStatus === "pushed").length, [items]);
  const notPushedCount = items.length - pushedCount;
  const totalExpectedValue = useMemo(() => items.reduce((sum, i) => sum + (i.expectedValue ?? 0), 0), [items]);

  const filteredItems = useMemo(() => {
    return items.filter((r) => {
      if (statusFilter === "pushed" && r.pushStatus !== "pushed") return false;
      if (statusFilter === "not_pushed" && r.pushStatus === "pushed") return false;
      if (search) {
        const haystack = [r.storeName, r.fullName, r.ownerName, r.storeCity, r.storeState].filter(Boolean).join(" ").toLowerCase();
        if (!haystack.includes(search.toLowerCase())) return false;
      }
      return true;
    });
  }, [items, search, statusFilter]);

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <Title level={3} style={{ margin: 0, letterSpacing: -0.3, color: appTokens.textPrimary }}>
        FOFO onboarding
      </Title>
      <Text style={{ color: appTokens.textSecondary, fontSize: 13.5 }}>Franchise store applications walked from applicant to onboarding-app push</Text>

      <div style={{ margin: "14px 0 12px", flexShrink: 0 }}>
        <StatsRow
          stats={[
            { label: "Handoffs", value: String(items.length), subtitle: "FOFO leads in your scope" },
            { label: "Pushed", value: String(pushedCount), subtitle: "reached the onboarding app", valueColor: appTokens.success },
            { label: "Not pushed", value: String(notPushedCount), subtitle: "still in the handoff", valueColor: appTokens.warning },
            { label: "Expected value", value: formatCompactCurrency(totalExpectedValue || null), subtitle: "across all handoffs" },
          ]}
        />
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 12, alignItems: "center", flexShrink: 0 }}>
        <Input.Search
          placeholder="Search store, applicant, owner, location"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          style={{ maxWidth: 360 }}
          allowClear
        />
        <Space size={6} wrap>
          <Tag.CheckableTag
            checked={statusFilter === null}
            onChange={() => {
              setStatusFilter(null);
              setPage(1);
            }}
          >
            All {items.length}
          </Tag.CheckableTag>
          <Tag.CheckableTag
            checked={statusFilter === "pushed"}
            onChange={(checked) => {
              setStatusFilter(checked ? "pushed" : null);
              setPage(1);
            }}
          >
            Pushed {pushedCount}
          </Tag.CheckableTag>
          <Tag.CheckableTag
            checked={statusFilter === "not_pushed"}
            onChange={(checked) => {
              setStatusFilter(checked ? "not_pushed" : null);
              setPage(1);
            }}
          >
            Not pushed {notPushedCount}
          </Tag.CheckableTag>
        </Space>
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
              animation: "fofo-stream-spin 0.7s linear infinite",
            }}
          />
          <Text style={{ fontSize: 12.5, color: appTokens.textSecondary }}>
            Loading the rest of the onboarding handoffs - {streamProgress.loaded.toLocaleString()} of {streamProgress.total.toLocaleString()}
          </Text>
          <style>{"@keyframes fofo-stream-spin { to { transform: rotate(360deg); } }"}</style>
        </div>
      )}

      <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
      <Table<FofoOnboardingListItem>
        className="thin-scroll-table"
        size="small"
        rowKey="id"
        loading={loading}
        dataSource={filteredItems.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)}
        pagination={false}
        onRow={(record) => ({
          onClick: () => navigate(`/fofo-onboarding/${record.id}`),
          className: "table-row-hover",
          style: { cursor: "pointer" },
        })}
        locale={{ emptyText: "No FOFO leads yet - onboarding starts from a FOFO-category lead's Onboard button" }}
        columns={[
          {
            title: "Store / applicant",
            key: "name",
            width: 220,
            render: (_, r) => (
              <div style={{ display: "flex", gap: 8, alignItems: "center", overflow: "hidden" }}>
                <Avatar size={28} style={{ background: avatarGradient(r.storeName || r.fullName), flexShrink: 0, fontSize: 12, fontWeight: 600 }}>
                  {initials(r.storeName || r.fullName)}
                </Avatar>
                <div style={{ minWidth: 0, overflow: "hidden" }}>
                  <Text
                    strong
                    style={{ fontSize: 13, display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
                    title={r.storeName || r.fullName}
                  >
                    {r.storeName || r.fullName}
                  </Text>
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    {r.leadNumber ? `L-${r.leadNumber}` : ""}
                  </Text>
                </div>
              </div>
            ),
          },
          {
            title: "Location",
            key: "location",
            width: 160,
            ellipsis: true,
            render: (_, r) => [r.storeCity, r.storeState].filter(Boolean).join(", ") || "-",
          },
          { title: "Owner", dataIndex: "ownerName", width: 140, ellipsis: true, render: (v: string | null) => v ?? "-" },
          { title: "Expected value", dataIndex: "expectedValue", width: 130, render: (v: number | null) => formatCompactCurrency(v) },
          {
            title: "Push status",
            key: "pushStatus",
            width: 160,
            render: (_, r) => {
              const pending = r.pushStatus !== "pushed";
              const idleDays = daysSince(r.createdAt);
              const stuck = pending && idleDays >= STUCK_AFTER_DAYS;
              return (
                <Space direction="vertical" size={0}>
                  <Tag color={pending ? "gold" : "green"}>{pending ? "Not pushed" : "Pushed"}</Tag>
                  {stuck && (
                    <Text style={{ fontSize: 10.5, fontWeight: 600, color: appTokens.danger, display: "flex", alignItems: "center", gap: 3 }}>
                      <HourglassOutlined style={{ fontSize: 10 }} />
                      {idleDays}d in handoff
                    </Text>
                  )}
                </Space>
              );
            },
          },
        ]}
      />
      </div>

      {filteredItems.length > 0 && (
        <div style={{ display: "flex", justifyContent: "center", padding: "12px 0", flexShrink: 0 }}>
          <Pagination current={page} pageSize={PAGE_SIZE} total={filteredItems.length} onChange={setPage} showSizeChanger={false} />
        </div>
      )}
    </div>
  );
}
