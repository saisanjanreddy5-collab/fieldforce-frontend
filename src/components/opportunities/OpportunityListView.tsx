import { Button, Table, Tag, Typography } from "antd";
import type { Opportunity } from "../../types/opportunity";
import { formatCompactCurrency } from "../../utils/lead-format";
import { CATEGORY_COLORS, STAGES, STAGE_DEFAULT_PROBABILITY } from "./stages";

const { Text } = Typography;

const STAGE_LABEL: Record<string, string> = Object.fromEntries(STAGES.map((s) => [s.key, s.label]));

interface OpportunityListViewProps {
  opportunities: Opportunity[];
  loading: boolean;
  onEdit: (opportunity: Opportunity) => void;
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
      scroll={{ x: 700 }}
      columns={[
        {
          title: "Opportunity",
          key: "opportunity",
          render: (_, o) => (
            <div>
              <Text strong>{o.name ?? o.leadFullName ?? "Untitled"}</Text>
              <div>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {[o.leadStoreCity, o.leadStoreState].filter(Boolean).join(", ")}
                  {o.leadCategory ? ` · ${o.leadCategory}` : ""}
                </Text>
              </div>
            </div>
          ),
        },
        {
          title: "Stage",
          dataIndex: "stage",
          render: (stage: string) => <Tag color={CATEGORY_COLORS[stage] ?? "blue"}>{STAGE_LABEL[stage] ?? stage}</Tag>,
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
          </Table.Summary.Row>
        ) : null
      }
    />
  );
}
