import { Avatar, Tag, Typography } from "antd";
import type { Lead } from "../../types/lead";
import { formatCompactCurrency, initials, scoreColor } from "../../utils/lead-format";
import { avatarGradient, appTokens } from "../../utils/design-system";

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
          <Text strong style={{ fontSize: 13, whiteSpace: "nowrap", flexShrink: 0, textAlign: "right", color: appTokens.textPrimary }}>
            {formatCompactCurrency(lead.expectedValue)}
          </Text>
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
              background: isOverdue ? "#fdecea" : appTokens.surfaceMuted,
              color: isOverdue ? appTokens.danger : appTokens.textSecondary,
              border: `1px solid ${isOverdue ? "#f7cfcc" : appTokens.borderLight}`,
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
          {lead.leadScore !== null && (
            <Text strong style={{ fontSize: 11, flexShrink: 0, color: scoreColor(lead.leadScore) }}>
              {lead.leadScore}%
            </Text>
          )}
        </div>
      </div>
    </div>
  );
}
