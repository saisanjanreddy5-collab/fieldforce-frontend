import type { CSSProperties } from "react";
import { Typography } from "antd";
import dayjs from "dayjs";
import type { LeaveRequest } from "../../types/leave";
import { appTokens } from "../../utils/design-system";

const { Text } = Typography;

const WINDOW_DAYS = 30;
const APPROVED_COLOR = appTokens.primary;
const PENDING_COLOR = appTokens.warning;
const WFH_COLOR = appTokens.textTertiary;

type CellState = "none" | "weekend" | "approved" | "pending" | "wfh";

function legendSwatch(color: string, label: string, filled: boolean) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
      <div
        style={{
          width: 9,
          height: 9,
          borderRadius: 2,
          background: filled ? color : "transparent",
          border: filled ? "none" : `1.5px solid ${color}`,
          flexShrink: 0,
        }}
      />
      <Text style={{ fontSize: 11.5, color: appTokens.textTertiary }}>{label}</Text>
    </div>
  );
}

interface TeamLeaveTimelineProps {
  requests: LeaveRequest[];
}

// A rolling 30-day Gantt-style strip per direct report - not a real
// calendar grid, since the point is "who's out and when" at a glance, not
// day-of-week/month boundaries. Weekly offs are deliberately left neutral
// even when a request's date range technically spans one (e.g. a Friday-
// Monday request covers the weekend in between), since a weekend was never
// a counted leave day in the first place.
export function TeamLeaveTimeline({ requests }: TeamLeaveTimelineProps) {
  const today = dayjs().startOf("day");
  const days = Array.from({ length: WINDOW_DAYS }, (_, i) => today.add(i, "day"));

  const byPerson = new Map<string, { name: string; requests: LeaveRequest[] }>();
  for (const req of requests) {
    if (!byPerson.has(req.userId)) byPerson.set(req.userId, { name: req.userName ?? "Unknown", requests: [] });
    byPerson.get(req.userId)!.requests.push(req);
  }

  const rows = Array.from(byPerson.values()).sort((a, b) => a.name.localeCompare(b.name));

  const cellStateFor = (person: { requests: LeaveRequest[] }, day: dayjs.Dayjs): CellState => {
    const dow = day.day();
    if (dow === 0 || dow === 6) return "weekend";
    const covering = person.requests.find(
      (r) => r.status !== "cancelled" && !day.isBefore(dayjs(r.startDate), "day") && !day.isAfter(dayjs(r.endDate), "day")
    );
    if (!covering) return "none";
    if (covering.kind === "wfh") return "wfh";
    if (covering.status === "approved") return "approved";
    if (covering.status === "pending") return "pending";
    return "none";
  };

  return (
    <div
      style={{
        border: `1px solid ${appTokens.border}`,
        borderRadius: appTokens.radius,
        background: appTokens.surface,
        boxShadow: appTokens.shadowSm,
        padding: 16,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
        <Text style={{ fontSize: 12.5, color: appTokens.textTertiary }}>
          Rolling {WINDOW_DAYS} days from today. Approved leave is solid, pending is outlined amber. Weekly offs are not shown.
        </Text>
        <div style={{ display: "flex", gap: 14 }}>
          {legendSwatch(APPROVED_COLOR, "Approved", true)}
          {legendSwatch(PENDING_COLOR, "Pending", false)}
          {legendSwatch(WFH_COLOR, "Work from home", true)}
        </div>
      </div>

      {rows.length === 0 ? (
        <Text style={{ fontSize: 13, color: appTokens.textTertiary }}>No leave in your team's next {WINDOW_DAYS} days.</Text>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 640 }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", fontSize: 11, fontWeight: 600, color: appTokens.textTertiary, textTransform: "uppercase", letterSpacing: 0.3, paddingBottom: 8, width: 160 }}>
                  Teammate
                </th>
                <th style={{ textAlign: "left", fontSize: 11, fontWeight: 600, color: appTokens.textTertiary, textTransform: "uppercase", letterSpacing: 0.3, paddingBottom: 8 }}>
                  Days
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((person, idx) => (
                <tr key={idx} style={{ borderTop: `1px solid ${appTokens.borderLight}` }}>
                  <td style={{ padding: "8px 0", fontSize: 13, fontWeight: 600, color: appTokens.textPrimary, verticalAlign: "middle" }}>{person.name}</td>
                  <td style={{ padding: "8px 0" }}>
                    <div style={{ display: "flex", gap: 2 }}>
                      {days.map((day, i) => {
                        const state = cellStateFor(person, day);
                        const style: CSSProperties = {
                          width: 10,
                          height: 18,
                          borderRadius: 2,
                          flexShrink: 0,
                        };
                        if (state === "weekend") style.background = appTokens.surfaceSunken;
                        else if (state === "approved") style.background = APPROVED_COLOR;
                        else if (state === "wfh") style.background = WFH_COLOR;
                        else if (state === "pending") {
                          style.background = "transparent";
                          style.border = `1.5px solid ${PENDING_COLOR}`;
                        } else style.background = appTokens.surfaceMuted;
                        return <div key={i} title={day.format("D MMM")} style={style} />;
                      })}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
