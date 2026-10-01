import { Card, Empty, Tag, Typography } from "antd";
import dayjs from "dayjs";
import type { Activity } from "../types/activity";
import { TYPE_LABEL, TypeBadge } from "../utils/activity-shared";
import { appTokens } from "../utils/design-system";

const { Title, Text } = Typography;

interface MyDayListProps {
  activities: Activity[];
  loading?: boolean;
}

export function MyDayList({ activities, loading }: MyDayListProps) {
  const endOfToday = dayjs().endOf("day");

  const dueItems = activities
    .filter((activity) => activity.status !== "completed" && activity.dueDate && dayjs(activity.dueDate).isBefore(endOfToday))
    .sort((a, b) => dayjs(a.dueDate).valueOf() - dayjs(b.dueDate).valueOf());

  return (
    <Card loading={loading} style={{ boxShadow: appTokens.shadowXs }}>
      <Title level={5} style={{ marginTop: 0, color: appTokens.textPrimary }}>
        My day
      </Title>
      {dueItems.length === 0 ? (
        <Empty description="Nothing due today" />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {dueItems.map((item) => {
            const isOverdue = dayjs(item.dueDate).isBefore(dayjs());
            return (
              <div
                key={item.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: 8,
                  paddingBottom: 12,
                  borderBottom: `1px solid ${appTokens.borderLight}`,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, flex: 1 }}>
                  <TypeBadge type={item.type} />
                  <div style={{ minWidth: 0 }}>
                    <Text strong style={{ color: appTokens.textPrimary }}>
                      {item.subject ?? TYPE_LABEL[item.type]}
                    </Text>
                    <div>
                      <Text style={{ fontSize: 12, color: appTokens.textTertiary }}>{TYPE_LABEL[item.type]}</Text>
                    </div>
                  </div>
                </div>
                <Tag color={isOverdue ? "error" : "processing"} style={{ flexShrink: 0 }}>
                  {isOverdue ? "Overdue" : dayjs(item.dueDate).format("h:mm A")}
                </Tag>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
