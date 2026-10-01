import type { ReactNode } from "react";
import { Progress, Typography } from "antd";
import dayjs from "dayjs";
import type { Opportunity } from "../../types/opportunity";
import { formatCompactCurrency } from "../../utils/lead-format";
import { appTokens } from "../../utils/design-system";
import { STAGES, STAGE_DEFAULT_PROBABILITY } from "./stages";

const { Title, Text } = Typography;

interface ForecastViewProps {
  opportunities: Opportunity[];
}

// Matches the flat-card header/body pattern used everywhere else in the app
// (Reports, the Opportunities stat cards) instead of AntD's stock <Card>,
// whose own header styling/shadow reads as a visibly different, older look
// sitting next to the rest of this same page.
function ForecastCard({ title, subtitle, flex, children }: { title: string; subtitle?: string; flex: number; children: ReactNode }) {
  return (
    <div
      style={{
        flex,
        minWidth: 260,
        border: `1px solid ${appTokens.border}`,
        borderRadius: appTokens.radius,
        background: appTokens.surface,
        boxShadow: appTokens.shadowXs,
        overflow: "hidden",
      }}
    >
      <div style={{ padding: "14px 18px", borderBottom: `1px solid ${appTokens.borderLight}` }}>
        <Text strong style={{ fontSize: 14, color: appTokens.textPrimary }}>
          {title}
        </Text>
        {subtitle && (
          <div>
            <Text style={{ fontSize: 12, color: appTokens.textTertiary }}>{subtitle}</Text>
          </div>
        )}
      </div>
      <div style={{ padding: 18 }}>{children}</div>
    </div>
  );
}

function weightedValue(o: Opportunity): number {
  const probability = o.probability ?? STAGE_DEFAULT_PROBABILITY[o.stage] ?? 0;
  return (o.value ?? 0) * (probability / 100);
}

export function ForecastView({ opportunities }: ForecastViewProps) {
  const open = opportunities.filter((o) => o.stage !== "won" && o.stage !== "lost");

  const byStage = STAGES.filter((s) => s.key !== "lost").map((stage) => {
    const items = open.filter((o) => o.stage === stage.key);
    const weighted = items.reduce((sum, o) => sum + weightedValue(o), 0);
    const avgProbability =
      items.length > 0
        ? Math.round(items.reduce((sum, o) => sum + (o.probability ?? STAGE_DEFAULT_PROBABILITY[o.stage] ?? 0), 0) / items.length)
        : 0;
    return { ...stage, count: items.length, weighted, avgProbability };
  });

  const maxWeighted = Math.max(1, ...byStage.map((s) => s.weighted));

  const commit = open
    .filter((o) => o.stage === "agreement" || o.stage === "won")
    .reduce((sum, o) => sum + (o.value ?? 0), 0);
  const bestCase = open.reduce((sum, o) => sum + (o.value ?? 0), 0);

  // Group by expected close month - opportunities with no close date are excluded.
  const monthMap = new Map<string, number>();
  for (const o of open) {
    if (!o.closeDate) continue;
    const key = dayjs(o.closeDate).format("MMMM YYYY");
    monthMap.set(key, (monthMap.get(key) ?? 0) + weightedValue(o));
  }
  const months = Array.from(monthMap.entries()).sort(
    (a, b) => dayjs(a[0], "MMMM YYYY").valueOf() - dayjs(b[0], "MMMM YYYY").valueOf()
  );
  const maxMonth = Math.max(1, ...months.map(([, v]) => v));

  return (
    <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
      <ForecastCard title="Weighted forecast by stage" subtitle="Stage probability × open value" flex={2}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {byStage.map((stage) => (
            <div key={stage.key}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, fontSize: 13 }}>
                <Text style={{ color: appTokens.textPrimary }}>{stage.label}</Text>
                <Text style={{ fontSize: 12, color: appTokens.textTertiary }}>
                  {stage.count} deals · {stage.avgProbability}% avg
                </Text>
                <Text strong style={{ color: appTokens.textPrimary }}>{formatCompactCurrency(stage.weighted)}</Text>
              </div>
              <Progress percent={(stage.weighted / maxWeighted) * 100} showInfo={false} size="small" strokeColor={stage.color} />
            </div>
          ))}
        </div>
      </ForecastCard>

      <ForecastCard title="Commit vs best case" flex={1}>
        <div style={{ marginBottom: 18 }}>
          <Text style={{ fontSize: 12, color: appTokens.textTertiary }}>Commit</Text>
          <div>
            <Text style={{ fontSize: 11, color: appTokens.textTertiary }}>Agreement stage and above</Text>
          </div>
          <Title level={4} style={{ margin: 0, color: appTokens.success }}>
            {formatCompactCurrency(commit)}
          </Title>
        </div>
        <div>
          <Text style={{ fontSize: 12, color: appTokens.textTertiary }}>Best case</Text>
          <div>
            <Text style={{ fontSize: 11, color: appTokens.textTertiary }}>All open, unweighted</Text>
          </div>
          <Title level={4} style={{ margin: 0, color: appTokens.primary }}>
            {formatCompactCurrency(bestCase)}
          </Title>
        </div>
      </ForecastCard>

      <ForecastCard title="Close month" flex={1}>
        {months.length === 0 ? (
          <Text style={{ color: appTokens.textTertiary }}>No opportunities have an expected close date yet</Text>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {months.map(([month, value]) => (
              <div key={month}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <Text style={{ color: appTokens.textPrimary }}>{month}</Text>
                  <Text strong style={{ color: appTokens.textPrimary }}>{formatCompactCurrency(value)}</Text>
                </div>
                <Progress percent={(value / maxMonth) * 100} showInfo={false} size="small" />
              </div>
            ))}
          </div>
        )}
      </ForecastCard>
    </div>
  );
}
