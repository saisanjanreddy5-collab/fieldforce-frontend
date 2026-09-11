import { Avatar, Progress, Tag, Typography } from "antd";
import type { Lead } from "../../types/lead";
import { formatCompactCurrency, initials, scoreColor } from "../../utils/lead-format";

const { Text } = Typography;

interface LeadCardProps {
  lead: Lead;
  selected: boolean;
  onClick: () => void;
}

export function LeadCard({ lead, selected, onClick }: LeadCardProps) {
  const location = [lead.storeCity, lead.storeState].filter(Boolean).join(", ");

  return (
    <div
      onClick={onClick}
      style={{
        display: "flex",
        gap: 10,
        padding: "10px 12px",
        cursor: "pointer",
        background: selected ? "#e6f4ff" : "transparent",
        borderLeft: selected ? "3px solid #1677ff" : "3px solid transparent",
        borderBottom: "1px solid #f0f0f0",
      }}
    >
      <Avatar shape="square" style={{ backgroundColor: "#1677ff", flexShrink: 0 }}>
        {initials(lead.fullName)}
      </Avatar>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
          <Text strong ellipsis style={{ flex: 1 }}>
            {lead.fullName}
          </Text>
          <Text strong style={{ whiteSpace: "nowrap" }}>
            {formatCompactCurrency(lead.expectedValue)}
          </Text>
        </div>
        <div>
          <Text type="secondary" style={{ fontSize: 12 }} ellipsis>
            {location || "-"}
          </Text>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
          {lead.category && <Tag style={{ margin: 0 }}>{lead.category}</Tag>}
          <Tag color={lead.hasOverdueActivity ? "error" : "default"} style={{ margin: 0 }}>
            {lead.status}
          </Tag>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {lead.ownerName ?? "Unassigned"}
          </Text>
        </div>
        {lead.leadScore !== null && (
          <Progress
            percent={lead.leadScore}
            size="small"
            showInfo
            strokeColor={scoreColor(lead.leadScore)}
            style={{ marginTop: 4 }}
          />
        )}
      </div>
    </div>
  );
}
