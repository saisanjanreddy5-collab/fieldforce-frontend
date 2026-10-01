import { Skeleton, Typography } from "antd";
import { appTokens } from "../utils/design-system";

const { Text } = Typography;

interface StatCardProps {
  label: string;
  value: string;
  loading?: boolean;
  subtitle?: string;
}

// The same compact, flat stat-card pattern used on Opportunities/Quotes -
// no decorative icon box, just label/value/subtitle, so this page reads as
// the same app as the rest of it instead of an older generation of the UI.
export function StatCard({ label, value, loading, subtitle }: StatCardProps) {
  return (
    <div
      style={{
        border: `1px solid ${appTokens.borderLight}`,
        borderRadius: appTokens.radius,
        padding: "14px 16px",
        background: appTokens.surface,
        boxShadow: appTokens.shadowXs,
      }}
    >
      {loading ? (
        <Skeleton active title={false} paragraph={{ rows: 2, width: ["60%", "40%"] }} />
      ) : (
        <>
          <Text style={{ fontSize: 12.5, fontWeight: 600, color: appTokens.textTertiary, letterSpacing: 0.2, display: "block" }}>
            {label}
          </Text>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 2 }}>
            <span style={{ fontSize: 24, fontWeight: 700, color: appTokens.textPrimary, letterSpacing: -0.4, lineHeight: 1.3 }}>{value}</span>
            {subtitle && <Text style={{ fontSize: 11.5, color: appTokens.textTertiary }}>{subtitle}</Text>}
          </div>
        </>
      )}
    </div>
  );
}
