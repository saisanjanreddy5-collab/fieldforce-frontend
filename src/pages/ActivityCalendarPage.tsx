import { useCallback, useEffect, useMemo, useState } from "react";
import { Avatar, Button, Spin, Typography, message } from "antd";
import { LeftOutlined, PlusOutlined, RightOutlined } from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";
import * as calendarApi from "../api/calendar-api";
import type { CalendarTeamMember, CalendarView } from "../types/calendar";
import type { Activity } from "../types/activity";
import { useAuth } from "../context/AuthContext";
import { appTokens, avatarGradient } from "../utils/design-system";
import { initials } from "../utils/lead-format";
import { dateKey, relativeSyncLabel, startOfWeekMonday } from "../utils/calendar-format";
import { DayTimeline } from "../components/calendar/DayTimeline";
import { CalendarGrid } from "../components/calendar/CalendarGrid";
import { NewActivityModal } from "../components/calendar/NewActivityModal";

const { Title, Text } = Typography;

type ViewMode = "day" | "week" | "month";

export default function ActivityCalendarPage() {
  const { user } = useAuth();
  const [viewMode, setViewMode] = useState<ViewMode>("day");
  const [viewingUserId, setViewingUserId] = useState<string | undefined>(undefined);
  const [anchorDate, setAnchorDate] = useState<Dayjs>(dayjs());
  const [selectedDate, setSelectedDate] = useState<Dayjs>(dayjs());

  const [team, setTeam] = useState<CalendarTeamMember[]>([]);
  const [view, setView] = useState<CalendarView | null>(null);
  const [loading, setLoading] = useState(true);
  const [newActivityOpen, setNewActivityOpen] = useState(false);

  useEffect(() => {
    calendarApi.getCalendarTeam().then(setTeam).catch(() => undefined);
  }, []);

  const range = useMemo(() => {
    if (viewMode === "day") return { from: anchorDate, to: anchorDate };
    if (viewMode === "week") {
      const from = startOfWeekMonday(anchorDate);
      return { from, to: from.add(6, "day") };
    }
    return { from: anchorDate.startOf("month"), to: anchorDate.endOf("month") };
  }, [viewMode, anchorDate]);

  const loadView = useCallback(() => {
    setLoading(true);
    return calendarApi
      .getCalendarView(viewingUserId, dateKey(range.from), dateKey(range.to))
      .then(setView)
      .catch(() => message.error("Failed to load the calendar"))
      .finally(() => setLoading(false));
  }, [viewingUserId, range]);

  useEffect(() => {
    loadView();
  }, [loadView]);

  const activitiesByDay = useMemo(() => {
    const map = new Map<string, Activity[]>();
    for (const activity of view?.activities ?? []) {
      if (!activity.dueDate) continue;
      const key = dateKey(dayjs(activity.dueDate));
      const list = map.get(key) ?? [];
      list.push(activity);
      map.set(key, list);
    }
    for (const list of map.values()) list.sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? ""));
    return map;
  }, [view]);

  const weekDays = useMemo(() => {
    const start = startOfWeekMonday(viewMode === "week" ? anchorDate : selectedDate);
    return Array.from({ length: 7 }, (_, i) => start.add(i, "day"));
  }, [anchorDate, selectedDate, viewMode]);

  const monthDays = useMemo(() => {
    const start = anchorDate.startOf("month");
    const leadingBlanks = (start.day() + 6) % 7; // Monday-first offset
    const daysInMonth = start.daysInMonth();
    const cells: (Dayjs | null)[] = Array(leadingBlanks).fill(null);
    for (let d = 0; d < daysInMonth; d++) cells.push(start.add(d, "day"));
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [anchorDate]);

  const goPrev = () => setAnchorDate((d) => d.subtract(1, viewMode === "day" ? "day" : viewMode === "week" ? "week" : "month"));
  const goNext = () => setAnchorDate((d) => d.add(1, viewMode === "day" ? "day" : viewMode === "week" ? "week" : "month"));
  const goToday = () => {
    setAnchorDate(dayjs());
    setSelectedDate(dayjs());
  };

  const rangeLabel =
    viewMode === "day"
      ? anchorDate.format("dddd, D MMMM YYYY")
      : viewMode === "week"
        ? `Week of ${startOfWeekMonday(anchorDate).format("D")}–${startOfWeekMonday(anchorDate).add(6, "day").format("D MMM YYYY")}`
        : anchorDate.format("MMMM YYYY");

  const stats = view?.stats;
  const statCards = [
    { label: "Scheduled this week", value: stats?.scheduledThisWeek ?? 0, subtitle: "activities" },
    { label: "Today", value: stats?.todayTotal ?? 0, subtitle: `${stats?.todayDone ?? 0} done` },
    {
      label: "Overdue",
      value: stats?.overdueCount ?? 0,
      subtitle: (stats?.overdueCount ?? 0) > 0 ? "need a note" : "all clear",
      color: (stats?.overdueCount ?? 0) > 0 ? appTokens.danger : undefined,
    },
    { label: "Field days", value: stats?.fieldDaysThisWeek ?? 0, subtitle: "this week" },
  ];

  const teamChips: (CalendarTeamMember & { isSelf: boolean })[] = [
    { id: user?.id ?? "self", name: "Me", isSelf: true },
    ...team.map((m) => ({ ...m, name: m.name.split(" ")[0], isSelf: false })),
  ];

  const headerSubtitleParts = view ? [view.user.name, view.user.zoneName, view.user.officeName].filter(Boolean) : [];
  if (view?.msSyncedAt) headerSubtitleParts.push("synced with Microsoft 365");

  const detailDate = viewMode === "day" ? anchorDate : selectedDate;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
        <div>
          <Title level={3} style={{ margin: 0, letterSpacing: -0.3, color: appTokens.textPrimary }}>
            My calendar
          </Title>
          <Text style={{ color: appTokens.textSecondary, fontSize: 13.5 }}>{headerSubtitleParts.join(" · ") || "Loading..."}</Text>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Button size="small" type="text" icon={<LeftOutlined />} onClick={goPrev} />
            <Button size="small" onClick={goToday}>
              Today
            </Button>
            <Button size="small" type="text" icon={<RightOutlined />} onClick={goNext} />
          </div>

          <div style={{ display: "flex", border: `1px solid ${appTokens.border}`, borderRadius: 8, overflow: "hidden" }}>
            {(["day", "week", "month"] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setViewMode(mode)}
                style={{
                  padding: "6px 14px",
                  fontSize: 13,
                  fontFamily: appTokens.font,
                  fontWeight: viewMode === mode ? 600 : 500,
                  border: "none",
                  borderLeft: mode !== "day" ? `1px solid ${appTokens.border}` : "none",
                  background: viewMode === mode ? appTokens.primarySoft : appTokens.surface,
                  color: viewMode === mode ? appTokens.primary : appTokens.textSecondary,
                  cursor: "pointer",
                }}
              >
                {mode[0].toUpperCase() + mode.slice(1)}
              </button>
            ))}
          </div>

          <div
            style={{
              padding: "6px 12px",
              borderRadius: 999,
              border: `1px solid ${appTokens.border}`,
              fontSize: 12.5,
              color: appTokens.textTertiary,
              background: appTokens.surfaceMuted,
              whiteSpace: "nowrap",
            }}
          >
            {relativeSyncLabel(view?.msSyncedAt ?? null)}
          </div>

          <Button type="primary" icon={<PlusOutlined />} onClick={() => setNewActivityOpen(true)}>
            New activity
          </Button>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <Text style={{ fontSize: 12, fontWeight: 600, color: appTokens.textTertiary }}>Calendar of</Text>
        {teamChips.map((chip) => {
          const active = chip.isSelf ? viewingUserId === undefined : viewingUserId === chip.id;
          return (
            <button
              key={chip.id}
              type="button"
              onClick={() => setViewingUserId(chip.isSelf ? undefined : chip.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "4px 10px 4px 4px",
                borderRadius: 999,
                border: `1.5px solid ${active ? appTokens.primary : appTokens.border}`,
                background: active ? appTokens.primarySoft : appTokens.surface,
                cursor: "pointer",
                fontFamily: appTokens.font,
              }}
            >
              <Avatar size={22} style={{ background: avatarGradient(chip.id), fontSize: 10, fontWeight: 600 }}>
                {chip.isSelf ? "Me" : initials(chip.name)}
              </Avatar>
              <Text style={{ fontSize: 12.5, fontWeight: active ? 600 : 500, color: active ? appTokens.primary : appTokens.textPrimary }}>
                {chip.name}
              </Text>
            </button>
          );
        })}
      </div>

      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 18 }}>
        {statCards.map((stat) => (
          <div
            key={stat.label}
            style={{
              flex: "1 1 180px",
              minWidth: 180,
              border: `1px solid ${appTokens.border}`,
              borderRadius: appTokens.radius,
              padding: "14px 16px",
              background: appTokens.surface,
              boxShadow: appTokens.shadowSm,
            }}
          >
            <Text style={{ fontSize: 11.5, fontWeight: 600, color: appTokens.textTertiary, display: "block" }}>{stat.label}</Text>
            <div style={{ fontSize: 26, fontWeight: 700, color: stat.color ?? appTokens.textPrimary, letterSpacing: -0.4, lineHeight: 1.25 }}>
              {stat.value}
            </div>
            <Text style={{ fontSize: 12, color: appTokens.textTertiary }}>{stat.subtitle}</Text>
          </div>
        ))}
      </div>

      {loading && !view ? (
        <Spin />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Text strong style={{ fontSize: 13.5 }}>
              {rangeLabel}
            </Text>
            {viewMode !== "day" && (
              <Text style={{ fontSize: 12, color: appTokens.textTertiary }}>Times are IST · click a day to open its detail</Text>
            )}
          </div>

          {viewMode === "day" && (
            <DayTimeline
              userName={view?.user.name ?? "Me"}
              zoneName={view?.user.zoneName ?? null}
              officeName={view?.user.officeName ?? null}
              date={anchorDate}
              activities={activitiesByDay.get(dateKey(anchorDate)) ?? []}
              dayTag={view?.dayTags[dateKey(anchorDate)]}
              onChanged={loadView}
            />
          )}

          {viewMode === "week" && (
            <CalendarGrid
              mode="week"
              days={weekDays}
              activitiesByDay={activitiesByDay}
              dayTags={view?.dayTags ?? {}}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
            />
          )}

          {viewMode === "month" && (
            <CalendarGrid
              mode="month"
              days={monthDays}
              activitiesByDay={activitiesByDay}
              dayTags={view?.dayTags ?? {}}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
            />
          )}

          {viewMode !== "day" && (
            <DayTimeline
              userName={view?.user.name ?? "Me"}
              zoneName={view?.user.zoneName ?? null}
              officeName={view?.user.officeName ?? null}
              date={detailDate}
              activities={activitiesByDay.get(dateKey(detailDate)) ?? []}
              dayTag={view?.dayTags[dateKey(detailDate)]}
              onChanged={loadView}
            />
          )}
        </div>
      )}

      <NewActivityModal
        open={newActivityOpen}
        onClose={() => setNewActivityOpen(false)}
        onCreated={() => {
          setNewActivityOpen(false);
          loadView();
        }}
        assignedToId={viewingUserId ?? user?.id ?? ""}
        assignedToName={view?.user.name ?? "Me"}
      />
    </div>
  );
}
