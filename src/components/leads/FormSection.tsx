import type { ReactNode } from "react";
import { Typography } from "antd";
import { appTokens } from "../../utils/design-system";

const { Text } = Typography;

interface FormSectionProps {
  icon: ReactNode;
  iconColor: string;
  title: string;
  description: string;
  /** Count of fields in this section that are actually required by the real validator - omitted entirely (not shown as "0 required") when nothing in the section is required, since a fabricated count would misrepresent real validation. */
  requiredCount?: number;
  children: ReactNode;
}

// The section-card primitive used throughout the New Lead form: icon + title
// + one-line description of why the data matters + an honest required-count
// badge, wrapping a 2-column field grid. Every LeadFormDrawer tab is built
// from one or more of these instead of a flat vertical Form.Item list.
export function FormSection({ icon, iconColor, title, description, requiredCount, children }: FormSectionProps) {
  return (
    <div
      style={{
        border: `1px solid ${appTokens.border}`,
        borderRadius: appTokens.radius,
        marginBottom: 16,
        overflow: "hidden",
        background: appTokens.surface,
        boxShadow: appTokens.shadowXs,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 12,
          padding: "14px 18px",
          background: appTokens.surfaceMuted,
          borderBottom: `1px solid ${appTokens.borderLight}`,
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: appTokens.radiusSm,
              background: iconColor,
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              fontSize: 14,
              marginTop: 1,
              boxShadow: appTokens.shadowXs,
            }}
          >
            {icon}
          </div>
          <div>
            <Text strong style={{ fontSize: 14, display: "block", color: appTokens.textPrimary }}>
              {title}
            </Text>
            <Text style={{ fontSize: 12, color: appTokens.textTertiary }}>{description}</Text>
          </div>
        </div>
        {Boolean(requiredCount) && (
          <span
            style={{
              flexShrink: 0,
              fontSize: 11,
              fontWeight: 600,
              color: appTokens.warning,
              background: "#fff8ec",
              border: "1px solid #ffe4ae",
              borderRadius: 999,
              padding: "3px 9px",
              whiteSpace: "nowrap",
            }}
          >
            {requiredCount} required
          </span>
        )}
      </div>
      <div style={{ padding: "18px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 20px" }}>{children}</div>
    </div>
  );
}

/** Wraps a Form.Item that should span both grid columns (e.g. a textarea). */
export function FormSectionFullWidth({ children }: { children: ReactNode }) {
  return <div style={{ gridColumn: "1 / -1" }}>{children}</div>;
}
