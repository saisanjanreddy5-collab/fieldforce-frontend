import { Skeleton, Tooltip, Typography } from "antd";
import { appTokens } from "../utils/design-system";

const { Text } = Typography;

export interface StatItem {
  label: string;
  value: string;
  subtitle?: string;
  // Only when a stat deliberately stands out from the rest (e.g. a
  // probability-adjusted forecast figure in the brand color) - omit for the
  // normal case, which already reads as textPrimary.
  valueColor?: string;
  // Explains a label that isn't self-evident (e.g. "Breaching SLA" needing
  // to clarify it's a fixed 48h threshold, not a configured SLA).
  labelHint?: string;
}

interface StatsRowProps {
  stats: StatItem[];
  loading?: boolean;
}

// Client decision (2026-11-11): every page used to render its own row of
// individually bordered/shadowed mini-cards - 4+ separate boxes sitting
// shoulder to shoulder, repeated near-identically in ~10 different files
// (Opportunities, Quotes, FOFO Onboarding, Customers, Team Dashboard,
// Approvals, QR Capture...), none of them actually sharing this component.
// That's what read as "everything is just lines and margins" once border
// contrast got fixed elsewhere - not the line color, the sheer count of
// separately-boxed containers on one screen. Fixed at the root: one shared
// card (one border, one shadow, one radius) with the individual numbers
// laid out as plain columns inside it, no divider lines between them at
// all - whitespace and type size alone do the separating, the way a real
// metrics bar reads in Linear/Stripe/HubSpot rather than a spreadsheet of
// cells. Every page above should import this instead of re-rendering its
// own copy.
export function StatsRow({ stats, loading }: StatsRowProps) {
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        border: `1px solid ${appTokens.border}`,
        borderRadius: appTokens.radius,
        background: appTokens.surface,
        boxShadow: appTokens.shadowSm,
        padding: "18px 24px",
        gap: "20px 40px",
      }}
    >
      {stats.map((stat) => (
        <div key={stat.label} style={{ flex: "1 1 150px", minWidth: 0 }}>
          {loading ? (
            <Skeleton active title={false} paragraph={{ rows: 2, width: ["60%", "40%"] }} />
          ) : (
            <>
              {stat.labelHint ? (
                <Tooltip title={stat.labelHint}>
                  <Text
                    style={{
                      fontSize: 12.5,
                      fontWeight: 600,
                      color: appTokens.textTertiary,
                      letterSpacing: 0.2,
                      display: "inline-block",
                      cursor: "help",
                      borderBottom: `1px dashed ${appTokens.textTertiary}`,
                    }}
                  >
                    {stat.label}
                  </Text>
                </Tooltip>
              ) : (
                <Text style={{ fontSize: 12.5, fontWeight: 600, color: appTokens.textTertiary, letterSpacing: 0.2, display: "block" }}>
                  {stat.label}
                </Text>
              )}
              <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 2, flexWrap: "wrap" }}>
                <span style={{ fontSize: 24, fontWeight: 700, color: stat.valueColor ?? appTokens.textPrimary, letterSpacing: -0.4, lineHeight: 1.3 }}>
                  {stat.value}
                </span>
                {stat.subtitle && <Text style={{ fontSize: 11.5, color: appTokens.textTertiary }}>{stat.subtitle}</Text>}
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );
}
