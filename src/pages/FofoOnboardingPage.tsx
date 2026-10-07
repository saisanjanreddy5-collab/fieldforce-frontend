import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Avatar, Input, Space, Table, Tag, Typography, message } from "antd";
import { CheckCircleOutlined, ClockCircleOutlined, HourglassOutlined, ShopOutlined, WalletOutlined } from "@ant-design/icons";
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
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(null);

  useEffect(() => {
    setLoading(true);
    fofoApi
      .listFofoOnboardings()
      .then((res) => setItems(res.leads))
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

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", margin: "18px 0" }}>
        {[
          { label: "Handoffs", value: String(items.length), subtitle: "FOFO leads in your scope", icon: <ShopOutlined />, color: appTokens.primary },
          { label: "Pushed", value: String(pushedCount), subtitle: "reached the onboarding app", icon: <CheckCircleOutlined />, color: appTokens.success },
          { label: "Not pushed", value: String(notPushedCount), subtitle: "still in the handoff", icon: <ClockCircleOutlined />, color: appTokens.warning },
          { label: "Expected value", value: formatCompactCurrency(totalExpectedValue || null), subtitle: "across all handoffs", icon: <WalletOutlined />, color: appTokens.purple },
        ].map((stat) => (
          <div
            key={stat.label}
            style={{
              flex: "1 1 180px",
              minWidth: 180,
              display: "flex",
              alignItems: "flex-start",
              gap: 12,
              border: `1px solid ${appTokens.borderLight}`,
              borderRadius: appTokens.radius,
              padding: 14,
              background: appTokens.surface,
              boxShadow: appTokens.shadowXs,
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: appTokens.radiusSm,
                background: `${stat.color}17`,
                color: stat.color,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 16,
                flexShrink: 0,
              }}
            >
              {stat.icon}
            </div>
            <div style={{ minWidth: 0 }}>
              <Text style={{ fontSize: 11.5, fontWeight: 600, color: appTokens.textTertiary, display: "block" }}>{stat.label}</Text>
              <div style={{ fontSize: 21, fontWeight: 700, color: appTokens.textPrimary, letterSpacing: -0.3 }}>{stat.value}</div>
              <Text style={{ fontSize: 11, color: appTokens.textTertiary }}>{stat.subtitle}</Text>
            </div>
          </div>
        ))}
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
  );
}
