import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Avatar, Input, Space, Table, Tag, Typography, message } from "antd";
import * as fofoApi from "../api/fofo-onboarding-api";
import type { FofoOnboardingListItem } from "../types/fofo-onboarding";
import { FofoHandoffDetail } from "../components/fofo/FofoHandoffDetail";
import { formatCompactCurrency, initials } from "../utils/lead-format";
import { appTokens, avatarGradient } from "../utils/design-system";

const { Title, Text } = Typography;

export default function FofoOnboardingPage() {
  const { leadId } = useParams<{ leadId?: string }>();

  if (leadId) {
    return <FofoHandoffDetail leadId={leadId} />;
  }

  return <FofoOnboardingList />;
}

type StatusFilter = "pushed" | "not_pushed" | null;

function FofoOnboardingList() {
  const navigate = useNavigate();
  const [items, setItems] = useState<FofoOnboardingListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(null);

  useEffect(() => {
    setLoading(true);
    fofoApi
      .listFofoOnboardings()
      .then(setItems)
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
    <div>
      <Title level={3} style={{ margin: 0, letterSpacing: -0.3, color: appTokens.textPrimary }}>
        FOFO onboarding
      </Title>
      <Text style={{ color: appTokens.textSecondary, fontSize: 13.5 }}>Franchise store applications walked from applicant to onboarding-app push</Text>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", margin: "18px 0" }}>
        <div
          style={{
            flex: "1 1 160px",
            minWidth: 160,
            background: appTokens.surface,
            border: `1px solid ${appTokens.border}`,
            borderRadius: appTokens.radius,
            padding: "12px 16px",
            boxShadow: appTokens.shadowXs,
          }}
        >
          <Text style={{ fontSize: 11, fontWeight: 600, color: appTokens.textTertiary }}>Handoffs</Text>
          <div style={{ fontSize: 21, fontWeight: 700, lineHeight: 1.3, color: appTokens.textPrimary }}>{items.length}</div>
          <Text style={{ fontSize: 11, color: appTokens.textTertiary }}>FOFO leads in your scope</Text>
        </div>
        <div style={{ flex: "1 1 160px", minWidth: 160, background: "#f0faf2", border: "1px solid #c8ecd0", borderRadius: appTokens.radius, padding: "12px 16px" }}>
          <Text style={{ fontSize: 11, fontWeight: 600, color: appTokens.success }}>Pushed</Text>
          <div style={{ fontSize: 21, fontWeight: 700, lineHeight: 1.3, color: "#0d7a3d" }}>{pushedCount}</div>
          <Text style={{ fontSize: 11, color: appTokens.success }}>reached the onboarding app</Text>
        </div>
        <div style={{ flex: "1 1 160px", minWidth: 160, background: "#fff8ec", border: "1px solid #ffe4ae", borderRadius: appTokens.radius, padding: "12px 16px" }}>
          <Text style={{ fontSize: 11, fontWeight: 600, color: appTokens.warning }}>Not pushed</Text>
          <div style={{ fontSize: 21, fontWeight: 700, lineHeight: 1.3, color: "#b56a00" }}>{notPushedCount}</div>
          <Text style={{ fontSize: 11, color: appTokens.warning }}>still in the handoff</Text>
        </div>
        <div
          style={{
            flex: "1 1 160px",
            minWidth: 160,
            background: appTokens.surface,
            border: `1px solid ${appTokens.border}`,
            borderRadius: appTokens.radius,
            padding: "12px 16px",
            boxShadow: appTokens.shadowXs,
          }}
        >
          <Text style={{ fontSize: 11, fontWeight: 600, color: appTokens.textTertiary }}>Expected value</Text>
          <div style={{ fontSize: 21, fontWeight: 700, lineHeight: 1.3, color: appTokens.textPrimary }}>
            {formatCompactCurrency(totalExpectedValue || null)}
          </div>
          <Text style={{ fontSize: 11, color: appTokens.textTertiary }}>across all handoffs</Text>
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 12, alignItems: "center" }}>
        <Input.Search
          placeholder="Search store, applicant, owner, location"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ maxWidth: 360 }}
          allowClear
        />
        <Space size={6} wrap>
          <Tag.CheckableTag checked={statusFilter === null} onChange={() => setStatusFilter(null)}>
            All {items.length}
          </Tag.CheckableTag>
          <Tag.CheckableTag checked={statusFilter === "pushed"} onChange={(checked) => setStatusFilter(checked ? "pushed" : null)}>
            Pushed {pushedCount}
          </Tag.CheckableTag>
          <Tag.CheckableTag checked={statusFilter === "not_pushed"} onChange={(checked) => setStatusFilter(checked ? "not_pushed" : null)}>
            Not pushed {notPushedCount}
          </Tag.CheckableTag>
        </Space>
      </div>

      <Table<FofoOnboardingListItem>
        className="thin-scroll-table"
        size="small"
        rowKey="id"
        loading={loading}
        dataSource={filteredItems}
        pagination={false}
        onRow={(record) => ({ onClick: () => navigate(`/fofo-onboarding/${record.id}`), style: { cursor: "pointer" } })}
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
            dataIndex: "pushStatus",
            width: 120,
            render: (v: string) => <Tag color={v === "pushed" ? "blue" : "default"}>{v === "pushed" ? "Pushed" : "Not pushed"}</Tag>,
          },
        ]}
      />
    </div>
  );
}
