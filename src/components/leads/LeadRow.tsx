import { Avatar, Tag, Typography } from "antd";
import type { Lead } from "../../types/lead";
import { formatCompactCurrency, formatFollowUpDate, initials, scoreColor } from "../../utils/lead-format";
import { avatarGradient, appTokens } from "../../utils/design-system";
import { LEAD_STATUS_COLORS } from "../../utils/lead-constants";

const { Text } = Typography;

interface LeadRowProps {
  lead: Lead;
  selected: boolean;
  /** Manager/Admin see Owner in the row by default; Agent doesn't need to (Decision 1) - resolved by the caller from auth context, never decided here. */
  showOwner: boolean;
  onClick: () => void;
}

// Two-line row: identity + value on top, category/status/location + owner/
// score below. A single 44px line couldn't hold category, status, owner,
// score and a legible name at once (verified: the flexible name+company
// area collapsed to single-digit pixel widths) - this composition matches
// the reference CRM's row density instead of forcing everything onto one
// line. A left urgency bar is still the first thing the eye should hit.
export function LeadRow({ lead, selected, showOwner, onClick }: LeadRowProps) {
  const location = [lead.storeCity, lead.storeState].filter(Boolean).join(", ");
  const isOverdue = Boolean(lead.hasOverdueActivity);
  const followUp = formatFollowUpDate(lead.nextActivityDueAt);

  return (
    <div
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 20px 10px 0",
        cursor: "pointer",
        transition: "background 0.12s",
        ...(selected ? { background: appTokens.primarySoft } : {}),
        borderBottom: `1px solid ${appTokens.borderLight}`,
      }}
      className="lead-row"
    >
      <div
        style={{
          width: 3,
          alignSelf: "stretch",
          background: selected ? appTokens.primary : isOverdue ? appTokens.danger : "transparent",
          flexShrink: 0,
          borderRadius: "0 2px 2px 0",
        }}
      />
      <Avatar
        size={32}
        shape="square"
        style={{ background: avatarGradient(lead.fullName), flexShrink: 0, fontSize: 12, fontWeight: 600, marginLeft: 8, borderRadius: 8 }}
      >
        {initials(lead.fullName)}
      </Avatar>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <Text
            strong
            style={{
              fontSize: 13.5,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              flex: 1,
              minWidth: 0,
              color: appTokens.textPrimary,
            }}
            title={lead.fullName}
          >
            {lead.fullName}
          </Text>
          <div style={{ flexShrink: 0, textAlign: "right" }}>
            <Text strong style={{ display: "block", fontSize: 13, whiteSpace: "nowrap", color: appTokens.textPrimary, lineHeight: 1.3 }}>
              {formatCompactCurrency(lead.expectedValue)}
            </Text>
            {lead.leadScore !== null && (
              <Text strong style={{ display: "block", fontSize: 11, whiteSpace: "nowrap", color: scoreColor(lead.leadScore), lineHeight: 1.3 }}>
                {lead.leadScore}%
              </Text>
            )}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
          {lead.category && (
            <Tag
              style={{
                margin: 0,
                flexShrink: 0,
                fontSize: 10,
                fontWeight: 600,
                lineHeight: "16px",
                padding: "0 6px",
                background: appTokens.primarySoft,
                color: appTokens.primary,
                border: `1px solid ${appTokens.primarySoftBorder}`,
              }}
            >
              {lead.category}
            </Tag>
          )}
          <Tag
            style={{
              margin: 0,
              flexShrink: 0,
              fontSize: 10,
              fontWeight: 600,
              lineHeight: "16px",
              padding: "0 6px",
              background: isOverdue ? "#fdecea" : `${LEAD_STATUS_COLORS[lead.status] ?? appTokens.textSecondary}17`,
              color: isOverdue ? appTokens.danger : LEAD_STATUS_COLORS[lead.status] ?? appTokens.textSecondary,
              border: isOverdue ? "1px solid #f7cfcc" : "none",
            }}
          >
            {lead.status}
          </Tag>
          <Text
            style={{
              fontSize: 11.5,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              flex: 1,
              minWidth: 0,
              color: appTokens.textTertiary,
            }}
          >
            {[lead.companyName, location].filter(Boolean).join(" · ") || "-"}
          </Text>
          {showOwner && (
            <Text
              style={{
                fontSize: 11,
                flexShrink: 0,
                maxWidth: 72,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                color: appTokens.textTertiary,
              }}
            >
              {lead.ownerName ?? "Unassigned"}
            </Text>
          )}
          {followUp && (
            <Text strong style={{ fontSize: 11, flexShrink: 0, color: followUp.overdue ? appTokens.danger : appTokens.textTertiary }}>
              {followUp.label}
            </Text>
          )}
        </div>
      </div>
    </div>
  );
}
