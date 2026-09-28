import { Avatar, Tag, Typography } from "antd";
import type { Dayjs } from "dayjs";
import type { Activity } from "../../types/activity";
import type { CalendarDayTag } from "../../types/calendar";
import { appTokens, avatarGradient } from "../../utils/design-system";
import { initials } from "../../utils/lead-format";
import { DAY_TAG_COLOR, DAY_TAG_LABEL } from "../../utils/calendar-format";
import { ActivityRow } from "./ActivityRow";

const { Text } = Typography;

interface DayTimelineProps {
  userName: string;
  zoneName: string | null;
  officeName: string | null;
  date: Dayjs;
  activities: Activity[];
  dayTag: CalendarDayTag | undefined;
}

export function DayTimeline({ userName, zoneName, officeName, date, activities, dayTag }: DayTimelineProps) {
  const doneCount = activities.filter((a) => a.status === "completed").length;
  const location = [zoneName, officeName].filter(Boolean).join(" · ");

  return (
    <div
      style={{
        border: `1px solid ${appTokens.border}`,
        borderRadius: appTokens.radius,
        background: appTokens.surface,
        boxShadow: appTokens.shadowSm,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          padding: "12px 14px",
          borderBottom: `1px solid ${appTokens.borderLight}`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <Avatar size={30} style={{ background: avatarGradient(userName), fontSize: 12, fontWeight: 600, flexShrink: 0 }}>
            {initials(userName)}
          </Avatar>
          <div style={{ minWidth: 0 }}>
            <Text strong style={{ fontSize: 13.5 }}>
              {userName} — {date.format("ddd D MMM")}
            </Text>
            <div>
              <Text style={{ fontSize: 12, color: appTokens.textTertiary }}>
                {activities.length} scheduled · {doneCount} done{location ? ` · ${location}` : ""}
              </Text>
            </div>
          </div>
        </div>
        {dayTag && (
          <Tag
            style={{
              margin: 0,
              color: DAY_TAG_COLOR[dayTag],
              background: `${DAY_TAG_COLOR[dayTag]}17`,
              border: "none",
              fontWeight: 600,
              flexShrink: 0,
            }}
          >
            {DAY_TAG_LABEL[dayTag]}
          </Tag>
        )}
      </div>

      <div style={{ padding: activities.length === 0 ? 14 : "2px 14px" }}>
        {activities.length === 0 ? (
          <Text style={{ color: appTokens.textTertiary, fontSize: 13 }}>Nothing scheduled for this day</Text>
        ) : (
          activities.map((activity, idx) => (
            <ActivityRow key={activity.id} activity={activity} isLast={idx === activities.length - 1} />
          ))
        )}
      </div>
    </div>
  );
}
