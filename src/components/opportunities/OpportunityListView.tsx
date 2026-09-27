import { Button, Table, Tag, Typography } from "antd";
import { CalendarOutlined } from "@ant-design/icons";
import type { Opportunity } from "../../types/opportunity";
import { formatCompactCurrency } from "../../utils/lead-format";
import { appTokens } from "../../utils/design-system";
import { CATEGORY_COLORS, STAGES, STAGE_DEFAULT_PROBABILITY } from "./stages";

const { Text } = Typography;

const STAGE_LABEL: Record<string, string> = Object.fromEntries(STAGES.map((s) => [s.key, s.label]));
const STAGE_COLOR: Record<string, string> = Object.fromEntries(STAGES.map((s) => [s.key, s.color]));

interface OpportunityListViewProps {
  opportunities: Opportunity[];
  loading: boolean;
  onEdit: (opportunity: Opportunity) => void;
}

// Same relative-urgency treatment as the Kanban card - "3d overdue" is
// actionable at a glance, a raw date isn't.
function dueLabel(closeDate: string | null): { text: string; overdue: boolean } {
  if (!closeDate) return { text: "-", overdue: false };
  const due = new Date(closeDate);
  const today = new Date();
  const dueDay = Date.UTC(due.getFullYear(), due.getMonth(), due.getDate());
  const todayDay = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const diffDays = Math.round((dueDay - todayDay) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return { text: `${Math.abs(diffDays)}d overdue`, overdue: true };
  if (diffDays === 0) return { text: "Today", overdue: false };
  if (diffDays === 1) return { text: "Tomorrow", overdue: false };
  return { text: `In ${diffDays}d`, overdue: false };
}

export function OpportunityListView({ opportunities, loading, onEdit }: OpportunityListViewProps) {
  const totalValue = opportunities.reduce((sum, o) => sum + (o.value ?? 0), 0);
  const totalWeighted = opportunities.reduce((sum, o) => {
    const probability = o.probability ?? STAGE_DEFAULT_PROBABILITY[o.stage] ?? 0;
    return sum + (o.value ?? 0) * (probability / 100);
  }, 0);

  return (
    <Table<Opportunity>
      rowKey="id"
      loading={loading}
      dataSource={opportunities}
      pagination={false}
      scroll={{ x: 820 }}
      className="thin-scroll-table"
      onRow={() => ({ className: "table-row-hover" })}
      columns={[
        {
          title: "Opportunity",
          key: "opportunity",
          render: (_, o) => (
            <div>
              <Text strong>{o.name ?? o.leadFullName ?? "Untitled"}</Text>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {[o.leadStoreCity, o.leadStoreState].filter(Boolean).join(", ")}
                </Text>
                {o.leadCategory && (
                  <Tag color={CATEGORY_COLORS[o.leadCategory] ?? "default"} style={{ marginRight: 0, fontSize: 10.5 }}>
                    {o.leadCategory}
                  </Tag>
                )}
              </div>
            </div>
          ),
        },
        {
          title: "Stage",
          dataIndex: "stage",
          render: (stage: string) => (
            <Tag
              style={{
                color: STAGE_COLOR[stage] ?? appTokens.textSecondary,
                background: `${STAGE_COLOR[stage] ?? appTokens.textTertiary}17`,
                border: "none",
                fontWeight: 600,
              }}
            >
              {STAGE_LABEL[stage] ?? stage}
            </Tag>
          ),
        },
        { title: "Owner", dataIndex: "ownerName", render: (v: string | null) => v ?? "Unassigned" },
        { title: "Value", dataIndex: "value", render: (v: number | null) => formatCompactCurrency(v) },
        {
          title: "Prob.",
          key: "probability",
          render: (_, o) => `${o.probability ?? STAGE_DEFAULT_PROBABILITY[o.stage] ?? 0}%`,
        },
        {
          title: "Weighted",
          key: "weighted",
          render: (_, o) => {
            const probability = o.probability ?? STAGE_DEFAULT_PROBABILITY[o.stage] ?? 0;
            return formatCompactCurrency((o.value ?? 0) * (probability / 100));
          },
        },
        {
          title: "Close date",
          key: "closeDate",
          render: (_, o) => {
            const due = dueLabel(o.closeDate);
            return (
              <Text style={{ fontSize: 12.5, fontWeight: due.overdue ? 700 : 400, color: due.overdue ? appTokens.danger : appTokens.textSecondary }}>
                <CalendarOutlined style={{ fontSize: 11, marginRight: 4 }} />
                {due.text}
              </Text>
            );
          },
        },
        {
          title: "",
          key: "action",
          render: (_, o) => (
            <Button type="link" size="small" onClick={() => onEdit(o)}>
              Edit
            </Button>
          ),
        },
      ]}
      summary={() =>
        opportunities.length > 0 ? (
          <Table.Summary.Row>
            <Table.Summary.Cell index={0} colSpan={3}>
              <Text strong>{opportunities.length} opportunities</Text>
            </Table.Summary.Cell>
            <Table.Summary.Cell index={1}>
              <Text strong>{formatCompactCurrency(totalValue)}</Text>
            </Table.Summary.Cell>
            <Table.Summary.Cell index={2} />
            <Table.Summary.Cell index={3}>
              <Text strong>{formatCompactCurrency(totalWeighted)}</Text>
            </Table.Summary.Cell>
            <Table.Summary.Cell index={4} />
            <Table.Summary.Cell index={5} />
          </Table.Summary.Row>
        ) : null
      }
    />
  );
}
