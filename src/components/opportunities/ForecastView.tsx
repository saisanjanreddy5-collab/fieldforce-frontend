import { Card, Progress, Typography } from "antd";
import dayjs from "dayjs";
import type { Opportunity } from "../../types/opportunity";
import { formatCompactCurrency } from "../../utils/lead-format";
import { STAGES, STAGE_DEFAULT_PROBABILITY } from "./stages";

const { Title, Text } = Typography;

interface ForecastViewProps {
  opportunities: Opportunity[];
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
      <Card title="Weighted forecast by stage" style={{ flex: 2, minWidth: 320 }} styles={{ body: { paddingTop: 8 } }}>
        <Text type="secondary" style={{ fontSize: 12 }}>
          Stage probability × open value
        </Text>
        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 12 }}>
          {byStage.map((stage) => (
            <div key={stage.key}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                <Text>{stage.label}</Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {stage.count} deals · {stage.avgProbability}% avg
                </Text>
                <Text strong>{formatCompactCurrency(stage.weighted)}</Text>
              </div>
              <Progress percent={(stage.weighted / maxWeighted) * 100} showInfo={false} size="small" />
            </div>
          ))}
        </div>
      </Card>

      <Card title="Commit vs best case" style={{ flex: 1, minWidth: 260 }}>
        <div style={{ marginBottom: 16 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Commit
          </Text>
          <div>
            <Text type="secondary" style={{ fontSize: 11 }}>
              Agreement stage and above
            </Text>
          </div>
          <Title level={4} style={{ margin: 0, color: "#0ca30c" }}>
            {formatCompactCurrency(commit)}
          </Title>
        </div>
        <div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Best case
          </Text>
          <div>
            <Text type="secondary" style={{ fontSize: 11 }}>
              All open, unweighted
            </Text>
          </div>
          <Title level={4} style={{ margin: 0 }}>
            {formatCompactCurrency(bestCase)}
          </Title>
        </div>
      </Card>

      <Card title="Close month" style={{ flex: 1, minWidth: 260 }}>
        {months.length === 0 ? (
          <Text type="secondary">No opportunities have an expected close date yet</Text>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {months.map(([month, value]) => (
              <div key={month}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <Text>{month}</Text>
                  <Text strong>{formatCompactCurrency(value)}</Text>
                </div>
                <Progress percent={(value / maxMonth) * 100} showInfo={false} size="small" />
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
