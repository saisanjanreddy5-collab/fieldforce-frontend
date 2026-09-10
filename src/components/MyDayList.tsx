import { Card, Empty, Tag, Typography } from "antd";
import dayjs from "dayjs";
import type { Activity, ActivityType } from "../types/activity";

const { Title, Text } = Typography;

const TYPE_LABEL: Record<ActivityType, string> = {
  call: "Call",
  email: "Email",
  teams_meeting: "Teams Meeting",
  site_visit: "Site Visit",
};

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
    <Card loading={loading}>
      <Title level={5} style={{ marginTop: 0 }}>
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
                  flexWrap: "wrap",
                  paddingBottom: 12,
                  borderBottom: "1px solid #f0f0f0",
                }}
              >
                <div>
                  <Text strong>{item.subject ?? TYPE_LABEL[item.type]}</Text>
                  <div>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {TYPE_LABEL[item.type]}
                    </Text>
                  </div>
                </div>
                <Tag color={isOverdue ? "error" : "processing"}>
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
