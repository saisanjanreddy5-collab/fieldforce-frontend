import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Avatar, Input, Space, Table, Tag, Typography, message } from "antd";
import * as fofoApi from "../api/fofo-onboarding-api";
import type { FofoOnboardingListItem } from "../types/fofo-onboarding";
import { FofoHandoffDetail } from "../components/fofo/FofoHandoffDetail";
import { formatCompactCurrency, initials } from "../utils/lead-format";

const { Title, Text } = Typography;

const AVATAR_COLORS = ["#1677ff", "#722ed1", "#eb2f96", "#0ca30c", "#fa8c16", "#13c2c2", "#eda100", "#2f54eb"];
function avatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

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
      <Title level={3} style={{ margin: 0 }}>
        FOFO onboarding
      </Title>
      <Text type="secondary">Franchise store applications walked from applicant to onboarding-app push</Text>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", margin: "16px 0" }}>
        <div style={{ flex: "1 1 160px", minWidth: 160, background: "#fafafa", borderRadius: 8, padding: "10px 14px" }}>
          <Text type="secondary" style={{ fontSize: 11 }}>
            Handoffs
          </Text>
          <div style={{ fontSize: 20, fontWeight: 600, lineHeight: 1.3 }}>{items.length}</div>
          <Text type="secondary" style={{ fontSize: 11 }}>
            FOFO leads in your scope
          </Text>
        </div>
        <div style={{ flex: "1 1 160px", minWidth: 160, background: "#f0fbf0", borderRadius: 8, padding: "10px 14px" }}>
          <Text style={{ fontSize: 11, color: "#237804" }}>Pushed</Text>
          <div style={{ fontSize: 20, fontWeight: 600, lineHeight: 1.3, color: "#237804" }}>{pushedCount}</div>
          <Text style={{ fontSize: 11, color: "#237804" }}>reached the onboarding app</Text>
        </div>
        <div style={{ flex: "1 1 160px", minWidth: 160, background: "#fff7ec", borderRadius: 8, padding: "10px 14px" }}>
          <Text style={{ fontSize: 11, color: "#ad6800" }}>Not pushed</Text>
          <div style={{ fontSize: 20, fontWeight: 600, lineHeight: 1.3, color: "#d46b08" }}>{notPushedCount}</div>
          <Text style={{ fontSize: 11, color: "#ad6800" }}>still in the handoff</Text>
        </div>
        <div style={{ flex: "1 1 160px", minWidth: 160, background: "#fafafa", borderRadius: 8, padding: "10px 14px" }}>
          <Text type="secondary" style={{ fontSize: 11 }}>
            Expected value
          </Text>
          <div style={{ fontSize: 20, fontWeight: 600, lineHeight: 1.3 }}>{formatCompactCurrency(totalExpectedValue || null)}</div>
          <Text type="secondary" style={{ fontSize: 11 }}>
            across all handoffs
          </Text>
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
                <Avatar size={28} style={{ backgroundColor: avatarColor(r.storeName || r.fullName), flexShrink: 0, fontSize: 12 }}>
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
