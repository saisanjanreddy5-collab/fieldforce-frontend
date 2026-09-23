import { Card, Typography } from "antd";
import type { ReactNode } from "react";
import { appTokens } from "../utils/design-system";

const { Text } = Typography;

interface StatCardProps {
  label: string;
  value: string;
  loading?: boolean;
  icon?: ReactNode;
  iconColor?: string;
}

export function StatCard({ label, value, loading, icon, iconColor = appTokens.primary }: StatCardProps) {
  return (
    <Card loading={loading} styles={{ body: { padding: 20 } }} style={{ boxShadow: appTokens.shadowXs }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
        <div>
          <Text style={{ fontSize: 12.5, fontWeight: 600, color: appTokens.textTertiary, letterSpacing: 0.2 }}>{label}</Text>
          <div style={{ fontSize: 28, fontWeight: 700, marginTop: 4, color: appTokens.textPrimary, letterSpacing: -0.5 }}>{value}</div>
        </div>
        {icon && (
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: appTokens.radiusSm,
              background: `${iconColor}14`,
              color: iconColor,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 16,
              flexShrink: 0,
            }}
          >
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
}
