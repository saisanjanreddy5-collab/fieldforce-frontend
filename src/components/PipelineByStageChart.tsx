import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, Empty, Typography } from "antd";
import type { PipelineStageStat } from "../types/dashboard";
import { formatCurrency } from "../utils/format";

const { Title } = Typography;

// Sequential blue ramp, ordinal steps (funnel stages are ordered, not just
// distinct categories - one hue, more-progressed = darker). The step nearest
// the surface stays at step 250 or darker to clear 2:1 contrast.
const BLUE_ORDINAL_STEPS = ["#86b6ef", "#6da7ec", "#5598e7", "#3987e5", "#2a78d6", "#256abf", "#1c5cab", "#184f95"];

const STAGE_ORDER = ["new", "qualified", "site_visit", "proposal", "negotiation", "agreement", "won", "lost"];

function sortByStageOrder(stats: PipelineStageStat[]): PipelineStageStat[] {
  return [...stats].sort((a, b) => {
    const ai = STAGE_ORDER.indexOf(a.stage);
    const bi = STAGE_ORDER.indexOf(b.stage);
    if (ai === -1 && bi === -1) return a.stage.localeCompare(b.stage);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });
}

function stageLabel(stage: string): string {
  return stage
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

interface PipelineByStageChartProps {
  data: PipelineStageStat[];
  loading?: boolean;
}

export function PipelineByStageChart({ data, loading }: PipelineByStageChartProps) {
  const sorted = sortByStageOrder(data);

  return (
    <Card loading={loading}>
      <Title level={5} style={{ marginTop: 0 }}>
        Pipeline by stage
      </Title>
      {sorted.length === 0 ? (
        <Empty description="No opportunities yet" />
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={sorted} margin={{ top: 8, right: 8, left: 0, bottom: 8 }} barCategoryGap="20%">
            <CartesianGrid vertical={false} stroke="#e1e0d9" />
            <XAxis
              dataKey="stage"
              tickFormatter={stageLabel}
              tick={{ fill: "#898781", fontSize: 12 }}
              axisLine={{ stroke: "#c3c2b7" }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "#898781", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value: number) => formatCurrency(value)}
              width={64}
            />
            <Tooltip
              formatter={(value) => formatCurrency(Number(value))}
              labelFormatter={(label) => stageLabel(String(label))}
              contentStyle={{ borderRadius: 8, border: "1px solid #e1e0d9" }}
            />
            <Bar dataKey="totalValue" radius={[4, 4, 0, 0]} maxBarSize={24}>
              {sorted.map((entry, index) => (
                <Cell key={entry.stage} fill={BLUE_ORDINAL_STEPS[Math.min(index, BLUE_ORDINAL_STEPS.length - 1)]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}
