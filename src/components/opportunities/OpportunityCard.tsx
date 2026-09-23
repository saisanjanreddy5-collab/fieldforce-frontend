import { Avatar, Progress, Tag, Tooltip, Typography } from "antd";
import { CommentOutlined } from "@ant-design/icons";
import type { Opportunity } from "../../types/opportunity";
import { formatCompactCurrency, formatDate, initials } from "../../utils/lead-format";
import { useHasPermission } from "../../hooks/use-permission";
import { appTokens, avatarGradient } from "../../utils/design-system";
import { CATEGORY_COLORS, STAGE_DEFAULT_PROBABILITY } from "./stages";

const { Text } = Typography;

interface OpportunityCardProps {
  opportunity: Opportunity;
  onClick: () => void;
  onDragStart: () => void;
}

export function OpportunityCard({ opportunity, onClick, onDragStart }: OpportunityCardProps) {
  const hasPermission = useHasPermission();
  const canDrag = hasPermission("opportunities.update");
  const title = opportunity.name ?? opportunity.leadFullName ?? "Untitled";
  const location = [opportunity.leadStoreCity, opportunity.leadStoreState].filter(Boolean).join(", ");
  const probability = opportunity.probability ?? STAGE_DEFAULT_PROBABILITY[opportunity.stage] ?? null;

  return (
    <div
      draggable={canDrag}
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", opportunity.id);
        onDragStart();
      }}
      onClick={onClick}
      style={{
        border: `1px solid ${appTokens.border}`,
        borderRadius: appTokens.radiusSm,
        padding: 12,
        background: appTokens.surface,
        cursor: canDrag ? "grab" : "pointer",
        marginBottom: 8,
        boxShadow: appTokens.shadowXs,
        transition: "box-shadow 0.12s, transform 0.12s",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 6 }}>
        <Text strong style={{ fontSize: 13, color: appTokens.textPrimary }}>
          {title}
        </Text>
        {opportunity.leadCategory && (
          <Tag color={CATEGORY_COLORS[opportunity.leadCategory] ?? "default"} style={{ marginRight: 0 }}>
            {opportunity.leadCategory}
          </Tag>
        )}
      </div>
      {location && <Text style={{ fontSize: 12, color: appTokens.textTertiary }}>{location}</Text>}
      <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8 }}>
        <Text strong style={{ fontSize: 13.5, color: appTokens.textPrimary }}>
          {formatCompactCurrency(opportunity.value)}
        </Text>
        {probability !== null && (
          <Progress percent={probability} size="small" showInfo={false} strokeColor={appTokens.primary} style={{ flex: 1, minWidth: 40 }} />
        )}
        {probability !== null && <Text style={{ fontSize: 11, color: appTokens.textTertiary }}>{probability}%</Text>}
      </div>
      <div style={{ marginTop: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={{ fontSize: 11, color: appTokens.textTertiary }}>
          {opportunity.closeDate ? formatDate(opportunity.closeDate) : "No close date"}
        </Text>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <CommentOutlined style={{ fontSize: 11, color: appTokens.textTertiary }} />
          {opportunity.ownerName && (
            <Tooltip title={opportunity.ownerName}>
              <Avatar size={20} style={{ background: avatarGradient(opportunity.ownerName), fontSize: 10, fontWeight: 600 }}>
                {initials(opportunity.ownerName)}
              </Avatar>
            </Tooltip>
          )}
        </div>
      </div>
    </div>
  );
}
