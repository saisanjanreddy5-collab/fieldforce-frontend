import { Typography } from "antd";
import type { QuoteVersion } from "../../types/quote";
import { formatCurrency } from "../../utils/lead-format";
import { appTokens } from "../../utils/design-system";

const { Text } = Typography;

// Read-only rendering of one version's line items + totals - used both for
// "here's the current version" on the quote detail view and for "here's
// what version 3 actually said" when reviewing history, so the two never
// drift into looking like different features.
export function QuoteVersionView({ version }: { version: QuoteVersion }) {
  return (
    <div>
      <div
        style={{
          border: `1px solid ${appTokens.border}`,
          borderRadius: appTokens.radius,
          overflow: "hidden",
          background: appTokens.surface,
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 70px 110px 70px 110px",
            gap: 8,
            padding: "10px 14px",
            background: appTokens.surfaceMuted,
            borderBottom: `1px solid ${appTokens.borderLight}`,
          }}
        >
          {["Description", "Qty", "Unit price", "Tax %", "Line total"].map((h) => (
            <Text key={h} style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.3, color: appTokens.textTertiary }}>
              {h}
            </Text>
          ))}
        </div>
        {version.lineItems.map((item, index) => (
          <div
            key={index}
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 70px 110px 70px 110px",
              gap: 8,
              padding: "9px 14px",
              alignItems: "center",
              borderBottom: index === version.lineItems.length - 1 ? "none" : `1px solid ${appTokens.borderLight}`,
            }}
          >
            <Text style={{ fontSize: 13, color: appTokens.textPrimary }}>{item.description}</Text>
            <Text style={{ fontSize: 13, color: appTokens.textSecondary }}>{item.quantity}</Text>
            <Text style={{ fontSize: 13, color: appTokens.textSecondary }}>{formatCurrency(item.unitPrice)}</Text>
            <Text style={{ fontSize: 13, color: appTokens.textSecondary }}>{item.taxPercent}%</Text>
            <Text strong style={{ fontSize: 13, color: appTokens.textPrimary }}>
              {formatCurrency(item.lineTotal)}
            </Text>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
        <div style={{ width: 240, display: "flex", flexDirection: "column", gap: 5 }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <Text style={{ fontSize: 12.5, color: appTokens.textSecondary }}>Subtotal</Text>
            <Text style={{ fontSize: 12.5, color: appTokens.textPrimary }}>{formatCurrency(version.subtotal)}</Text>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <Text style={{ fontSize: 12.5, color: appTokens.textSecondary }}>Tax</Text>
            <Text style={{ fontSize: 12.5, color: appTokens.textPrimary }}>{formatCurrency(version.taxTotal)}</Text>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 6, borderTop: `1px solid ${appTokens.border}` }}>
            <Text strong style={{ fontSize: 14, color: appTokens.textPrimary }}>
              Grand total
            </Text>
            <Text strong style={{ fontSize: 14, color: appTokens.primary }}>
              {formatCurrency(version.grandTotal)}
            </Text>
          </div>
        </div>
      </div>

      {version.notes && (
        <div style={{ marginTop: 14, padding: 12, background: appTokens.surfaceSunken, borderRadius: appTokens.radiusSm }}>
          <Text style={{ fontSize: 11, fontWeight: 600, color: appTokens.textTertiary, textTransform: "uppercase", letterSpacing: 0.3 }}>
            Notes
          </Text>
          <div>
            <Text style={{ fontSize: 13, color: appTokens.textSecondary }}>{version.notes}</Text>
          </div>
        </div>
      )}
    </div>
  );
}
