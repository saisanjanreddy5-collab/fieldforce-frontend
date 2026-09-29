import { useEffect, useState } from "react";
import { Tag, Typography, message } from "antd";
import * as leadApi from "../../api/lead-api";
import type { LeadQuickFilterCounts } from "../../api/lead-api";
import { appTokens } from "../../utils/design-system";

const { Text } = Typography;

interface Row {
  key: string;
  name: string;
  description: string;
  status: "live" | "not_built";
}

// Same flat-row pattern as every other Settings tab. Only 2 of the
// reference's 5 rows have anything real behind them - see the audit that
// led here: no tickets table exists anywhere in FieldForce, so the 3
// ticket-priority SLA rows stay honestly unbuilt.
export function SlaEscalationTab() {
  const [counts, setCounts] = useState<LeadQuickFilterCounts | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    leadApi
      .getQuickFilterCounts()
      .then(setCounts)
      .catch(() => message.error("Failed to load lead counts"))
      .finally(() => setLoading(false));
  }, []);

  const rows: Row[] = [
    {
      key: "overdue_lead",
      name: "Overdue lead follow-up",
      description: `Real, live count - ${loading ? "…" : (counts?.overdue ?? 0)} lead${counts?.overdue === 1 ? "" : "s"} right now with a pending activity past its due date. No notification fires yet - there's no email/push system anywhere in FieldForce to send one through.`,
      status: "live",
    },
    {
      key: "unassigned_lead",
      name: "Unassigned lead",
      description: `Real, live count - ${loading ? "…" : (counts?.unassigned ?? 0)} lead${counts?.unassigned === 1 ? "" : "s"} with no owner. Previously invisible to everyone by design; admin can now see and assign these (see the Leads quick filters).`,
      status: "live",
    },
    {
      key: "high_priority_ticket",
      name: "High priority ticket",
      description: "Doesn't exist - no support-ticket system anywhere in FieldForce yet.",
      status: "not_built",
    },
    {
      key: "medium_priority_ticket",
      name: "Medium priority ticket",
      description: "Doesn't exist - no support-ticket system anywhere in FieldForce yet.",
      status: "not_built",
    },
    {
      key: "low_priority_ticket",
      name: "Low priority ticket",
      description: "Doesn't exist - no support-ticket system anywhere in FieldForce yet.",
      status: "not_built",
    },
  ];

  const STATUS_LABEL: Record<Row["status"], string> = { live: "Live", not_built: "Not built" };
  const STATUS_COLOR: Record<Row["status"], string> = { live: appTokens.success, not_built: appTokens.textTertiary };

  return (
    <div
      style={{
        border: `1px solid ${appTokens.border}`,
        borderRadius: appTokens.radius,
        background: appTokens.surface,
        boxShadow: appTokens.shadowSm,
      }}
    >
      <div style={{ padding: "14px 18px", borderBottom: `1px solid ${appTokens.borderLight}` }}>
        <Text strong style={{ fontSize: 14 }}>
          SLA &amp; escalation
        </Text>
        <div>
          <Text style={{ fontSize: 12.5, color: appTokens.textTertiary }}>
            Applies to support tickets and overdue follow-ups. "Live" means a real number computed right now, not a
            firing alert - FieldForce has no notification system yet to actually send one.
          </Text>
        </div>
      </div>

      {rows.map((row, idx) => (
        <div
          key={row.key}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 18,
            padding: "14px 28px 14px 18px",
            borderBottom: idx === rows.length - 1 ? "none" : `1px solid ${appTokens.borderLight}`,
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <Text strong style={{ fontSize: 13.5 }}>
              {row.name}
            </Text>
            <div>
              <Text style={{ fontSize: 12, color: appTokens.textTertiary }}>{row.description}</Text>
            </div>
          </div>
          <Tag
            style={{
              margin: 0,
              width: 96,
              textAlign: "center",
              fontWeight: 600,
              border: "none",
              color: STATUS_COLOR[row.status],
              background: `${STATUS_COLOR[row.status]}17`,
              flexShrink: 0,
            }}
          >
            {STATUS_LABEL[row.status]}
          </Tag>
        </div>
      ))}
    </div>
  );
}
