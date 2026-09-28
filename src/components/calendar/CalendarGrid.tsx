import { Tag, Typography } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import type { Activity } from "../../types/activity";
import type { CalendarDayTag } from "../../types/calendar";
import { TYPE_DOT_COLOR } from "../../utils/activity-shared";
import { appTokens } from "../../utils/design-system";
import { dateKey, DAY_TAG_COLOR, DAY_TAG_LABEL } from "../../utils/calendar-format";

const { Text } = Typography;

const WEEKDAY_HEADERS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

interface CalendarGridProps {
  mode: "week" | "month";
  days: (Dayjs | null)[];
  activitiesByDay: Map<string, Activity[]>;
  dayTags: Record<string, CalendarDayTag>;
  selectedDate: Dayjs;
  onSelectDate: (date: Dayjs) => void;
}

export function CalendarGrid({ mode, days, activitiesByDay, dayTags, selectedDate, onSelectDate }: CalendarGridProps) {
  const today = dayjs();
  const cellMinHeight = mode === "week" ? 220 : 110;
  const maxPreview = mode === "week" ? 6 : 2;

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
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", borderBottom: `1px solid ${appTokens.borderLight}` }}>
        {WEEKDAY_HEADERS.map((label) => (
          <div key={label} style={{ padding: "8px 10px", textAlign: mode === "week" ? "left" : "center" }}>
            <Text style={{ fontSize: 11, fontWeight: 700, color: appTokens.textTertiary, letterSpacing: 0.4 }}>{label}</Text>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
        {days.map((day, idx) => {
          if (!day) {
            return (
              <div
                key={`blank-${idx}`}
                style={{ minHeight: cellMinHeight, borderRight: `1px solid ${appTokens.borderLight}`, borderTop: `1px solid ${appTokens.borderLight}` }}
              />
            );
          }

          const key = dateKey(day);
          const dayActivities = activitiesByDay.get(key) ?? [];
          const tag = dayTags[key];
          const isSelected = day.isSame(selectedDate, "day");
          const isToday = day.isSame(today, "day");

          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelectDate(day)}
              style={{
                minHeight: cellMinHeight,
                textAlign: "left",
                border: "none",
                borderRight: `1px solid ${appTokens.borderLight}`,
                borderTop: `1px solid ${appTokens.borderLight}`,
                background: isSelected ? appTokens.primarySoft : appTokens.surface,
                cursor: "pointer",
                padding: "8px 8px",
                display: "flex",
                flexDirection: "column",
                gap: 6,
                fontFamily: appTokens.font,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span
                  style={{
                    fontSize: mode === "week" ? 13 : 12.5,
                    fontWeight: isToday ? 700 : 500,
                    color: isToday ? appTokens.primary : appTokens.textPrimary,
                  }}
                >
                  {mode === "week" ? day.format("D MMM") : day.date()}
                </span>
                {tag && (
                  <Tag
                    style={{
                      margin: 0,
                      fontSize: 10,
                      lineHeight: "14px",
                      padding: "0 5px",
                      color: DAY_TAG_COLOR[tag],
                      background: `${DAY_TAG_COLOR[tag]}17`,
                      border: "none",
                      fontWeight: 600,
                    }}
                  >
                    {DAY_TAG_LABEL[tag]}
                  </Tag>
                )}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                {dayActivities.slice(0, maxPreview).map((activity) => (
                  <div
                    key={activity.id}
                    style={{
                      fontSize: 10.5,
                      padding: "2px 5px",
                      borderRadius: 4,
                      background: `${TYPE_DOT_COLOR[activity.type]}17`,
                      color: TYPE_DOT_COLOR[activity.type],
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      fontWeight: 600,
                    }}
                  >
                    {activity.dueDate ? dayjs(activity.dueDate).format("HH:mm") : ""} {activity.subject ?? ""}
                  </div>
                ))}
                {dayActivities.length > maxPreview && (
                  <Text style={{ fontSize: 10, color: appTokens.textTertiary }}>+{dayActivities.length - maxPreview} more</Text>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
