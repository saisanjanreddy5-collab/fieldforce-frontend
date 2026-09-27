import { Avatar, Progress, Tag, Tooltip, Typography } from "antd";
import { CalendarOutlined, CommentOutlined, HourglassOutlined } from "@ant-design/icons";
import type { Opportunity } from "../../types/opportunity";
import { formatCompactCurrency, initials } from "../../utils/lead-format";
import { useHasPermission } from "../../hooks/use-permission";
import { appTokens, avatarGradient } from "../../utils/design-system";
import { CATEGORY_COLORS, STAGES, STAGE_DEFAULT_PROBABILITY } from "./stages";

const { Text } = Typography;

// A rough "hasn't moved lately" signal, not a precise stage timer (there's
// no stage-entered-at field, just updatedAt) - still a useful flag for a
// deal that's gone quiet, which is exactly the kind of thing a pipeline
// view should surface at a glance rather than hide.
const STALE_AFTER_DAYS = 10;

function daysSince(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
}

// A relative, scannable urgency label instead of a plain date - "3 days
// overdue" (in red) tells a rep something actionable at a glance, "10 Oct
// 2026" doesn't without doing the math themselves.
function dueLabel(closeDate: string | null): { text: string; overdue: boolean } {
  if (!closeDate) return { text: "No close date", overdue: false };
  const due = new Date(closeDate);
  const today = new Date();
  const dueDay = Date.UTC(due.getFullYear(), due.getMonth(), due.getDate());
  const todayDay = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const diffDays = Math.round((dueDay - todayDay) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return { text: `${Math.abs(diffDays)}d overdue`, overdue: true };
  if (diffDays === 0) return { text: "Due today", overdue: false };
  if (diffDays === 1) return { text: "Due tomorrow", overdue: false };
  return { text: `Due in ${diffDays}d`, overdue: false };
}

// Colors the progress bar by how healthy the deal actually is (probability
// tier) rather than repeating the same stage color the left stripe and
// column dot already show - a second, genuinely different signal instead
// of redundant color.
function probabilityColor(percent: number): string {
  if (percent >= 70) return appTokens.success;
  if (percent >= 40) return appTokens.warning;
  return appTokens.textTertiary;
}

interface OpportunityCardProps {
  opportunity: Opportunity;
  onClick: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  dragging: boolean;
}

export function OpportunityCard({ opportunity, onClick, onDragStart, onDragEnd, dragging }: OpportunityCardProps) {
  const hasPermission = useHasPermission();
  const canDrag = hasPermission("opportunities.update");
  const title = opportunity.name ?? opportunity.leadFullName ?? "Untitled";
  const cityState = [opportunity.leadStoreCity, opportunity.leadStoreState].filter(Boolean).join(", ");
  const location = [cityState, opportunity.ownerName ?? "Unassigned"].filter(Boolean).join(" · ");
  const probability = opportunity.probability ?? STAGE_DEFAULT_PROBABILITY[opportunity.stage] ?? null;
  const due = dueLabel(opportunity.closeDate);
  const stageColor = STAGES.find((s) => s.key === opportunity.stage)?.color ?? appTokens.primary;
  const isTerminal = opportunity.stage === "won" || opportunity.stage === "lost";
  const idleDays = daysSince(opportunity.updatedAt);
  const isStale = !isTerminal && idleDays >= STALE_AFTER_DAYS;

  return (
    <div
      className="opportunity-card"
      draggable={canDrag}
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", opportunity.id);
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      onClick={onClick}
      style={{
        display: "flex",
        border: `1px solid ${appTokens.borderLight}`,
        borderRadius: appTokens.radiusSm,
        background: appTokens.surface,
        cursor: canDrag ? "grab" : "pointer",
        marginBottom: 8,
        boxShadow: appTokens.shadowXs,
        opacity: dragging ? 0.4 : 1,
        transition: "box-shadow 0.15s, transform 0.15s, opacity 0.15s, border-color 0.15s",
        overflow: "hidden",
      }}
    >
      <div style={{ width: 4, flexShrink: 0, background: stageColor }} />
      <div style={{ padding: "10px 12px", flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 6 }}>
          <Text strong style={{ fontSize: 13, color: appTokens.textPrimary, lineHeight: 1.35 }}>
            {title}
          </Text>
          {opportunity.leadCategory && (
            <Tag color={CATEGORY_COLORS[opportunity.leadCategory] ?? "default"} style={{ marginRight: 0, flexShrink: 0 }}>
              {opportunity.leadCategory}
            </Tag>
          )}
        </div>
        {location && (
          <Text style={{ fontSize: 12, color: appTokens.textTertiary, display: "block", marginTop: 1 }}>{location}</Text>
        )}
        {isStale && (
          <Text style={{ fontSize: 10.5, fontWeight: 600, color: appTokens.warning, display: "flex", alignItems: "center", gap: 3, marginTop: 3 }}>
            <HourglassOutlined style={{ fontSize: 10 }} />
            No update in {idleDays}d
          </Text>
        )}
        <div style={{ marginTop: 9, display: "flex", alignItems: "center", gap: 8 }}>
          <Text strong style={{ fontSize: 14.5, color: appTokens.textPrimary, letterSpacing: -0.2 }}>
            {formatCompactCurrency(opportunity.value)}
          </Text>
          {probability !== null && (
            <Progress percent={probability} size="small" showInfo={false} strokeColor={probabilityColor(probability)} style={{ flex: 1, minWidth: 32 }} />
          )}
          {probability !== null && (
            <Text style={{ fontSize: 11, fontWeight: 600, color: appTokens.textTertiary, flexShrink: 0 }}>{probability}%</Text>
          )}
        </div>
        <div style={{ marginTop: 9, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Text
            style={{
              fontSize: 11,
              fontWeight: due.overdue ? 700 : 400,
              color: due.overdue ? appTokens.danger : appTokens.textTertiary,
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <CalendarOutlined style={{ fontSize: 10.5 }} />
            {due.text}
          </Text>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {(opportunity.activityCount ?? 0) > 0 && (
              <Text style={{ fontSize: 11, color: appTokens.textTertiary, display: "flex", alignItems: "center", gap: 3 }}>
                <CommentOutlined style={{ fontSize: 11 }} />
                {opportunity.activityCount}
              </Text>
            )}
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
    </div>
  );
}
