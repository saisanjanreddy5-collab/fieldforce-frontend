import { Avatar, Progress, Tag, Tooltip, Typography } from "antd";
import { CommentOutlined } from "@ant-design/icons";
import type { Opportunity } from "../../types/opportunity";
import { formatCompactCurrency, formatDate, initials } from "../../utils/lead-format";
import { CATEGORY_COLORS, STAGE_DEFAULT_PROBABILITY } from "./stages";

const { Text } = Typography;

interface OpportunityCardProps {
  opportunity: Opportunity;
  onClick: () => void;
  onDragStart: () => void;
}

export function OpportunityCard({ opportunity, onClick, onDragStart }: OpportunityCardProps) {
  const title = opportunity.name ?? opportunity.leadFullName ?? "Untitled";
  const location = [opportunity.leadStoreCity, opportunity.leadStoreState].filter(Boolean).join(", ");
  const probability = opportunity.probability ?? STAGE_DEFAULT_PROBABILITY[opportunity.stage] ?? null;

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", opportunity.id);
        onDragStart();
      }}
      onClick={onClick}
      style={{
        border: "1px solid #f0f0f0",
        borderRadius: 8,
        padding: 10,
        background: "#fff",
        cursor: "grab",
        marginBottom: 8,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 6 }}>
        <Text strong style={{ fontSize: 13 }}>
          {title}
        </Text>
        {opportunity.leadCategory && (
          <Tag color={CATEGORY_COLORS[opportunity.leadCategory] ?? "default"} style={{ marginRight: 0 }}>
            {opportunity.leadCategory}
          </Tag>
        )}
      </div>
      {location && (
        <Text type="secondary" style={{ fontSize: 12 }}>
          {location}
        </Text>
      )}
      <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 8 }}>
        <Text strong style={{ fontSize: 13 }}>
          {formatCompactCurrency(opportunity.value)}
        </Text>
        {probability !== null && (
          <Progress percent={probability} size="small" showInfo={false} style={{ flex: 1, minWidth: 40 }} />
        )}
        {probability !== null && (
          <Text type="secondary" style={{ fontSize: 11 }}>
            {probability}%
          </Text>
        )}
      </div>
      <div style={{ marginTop: 6, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Text type="secondary" style={{ fontSize: 11 }}>
          {opportunity.closeDate ? formatDate(opportunity.closeDate) : "No close date"}
        </Text>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <CommentOutlined style={{ fontSize: 11, color: "#c3c2b7" }} />
          {opportunity.ownerName && (
            <Tooltip title={opportunity.ownerName}>
              <Avatar size={20} style={{ backgroundColor: "#1677ff", fontSize: 10 }}>
                {initials(opportunity.ownerName)}
              </Avatar>
            </Tooltip>
          )}
        </div>
      </div>
    </div>
  );
}
