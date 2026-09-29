import { useEffect, useState } from "react";
import { Button, Tooltip, Typography, message } from "antd";
import dayjs from "dayjs";
import * as teamDashboardApi from "../api/team-dashboard-api";
import * as leaveApi from "../api/leave-api";
import * as expenseApi from "../api/expense-api";
import { ApplyForLeaveModal } from "../components/leave/ApplyForLeaveModal";
import { NewExpenseClaimModal } from "../components/expenses/NewExpenseClaimModal";
import { useAuth } from "../context/AuthContext";
import { useHasPermission } from "../hooks/use-permission";
import type { TeamAvailability, TeamDayTag } from "../types/team-dashboard";
import type { LeaveBalance, LeaveContextPerson } from "../types/leave";
import type { ExpenseType } from "../types/expense";
import { appTokens } from "../utils/design-system";

const { Title, Text } = Typography;

const TAG_LABEL: Record<TeamDayTag, string> = {
  field: "Field",
  office: "Office",
  leave: "Leave",
  weekly_off: "Weekly off",
  none: "—",
};

const TAG_COLOR: Record<TeamDayTag, { fg: string; bg: string }> = {
  field: { fg: appTokens.primary, bg: appTokens.primarySoft },
  office: { fg: appTokens.textSecondary, bg: appTokens.surfaceMuted },
  leave: { fg: appTokens.danger, bg: `${appTokens.danger}17` },
  weekly_off: { fg: appTokens.textTertiary, bg: appTokens.surfaceSunken },
  none: { fg: appTokens.textTertiary, bg: "transparent" },
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div
      style={{
        flex: 1,
        minWidth: 150,
        border: `1px solid ${appTokens.border}`,
        borderRadius: appTokens.radius,
        background: appTokens.surface,
        boxShadow: appTokens.shadowSm,
        padding: "14px 16px",
      }}
    >
      <Text style={{ fontSize: 11.5, color: appTokens.textTertiary }}>{label}</Text>
      <div style={{ fontSize: 22, fontWeight: 700, color: appTokens.textPrimary, lineHeight: 1.3 }}>{value}</div>
      {sub && <Text style={{ fontSize: 11.5, color: appTokens.textTertiary }}>{sub}</Text>}
    </div>
  );
}

export default function TeamDashboardPage() {
  const { user } = useAuth();
  const hasPermission = useHasPermission();
  const [data, setData] = useState<TeamAvailability | null>(null);
  const [loading, setLoading] = useState(true);

  const [leaveOpen, setLeaveOpen] = useState(false);
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [peers, setPeers] = useState<LeaveContextPerson[]>([]);
  const [expenseTypes, setExpenseTypes] = useState<ExpenseType[]>([]);

  const load = () => {
    setLoading(true);
    teamDashboardApi
      .getTeamAvailability()
      .then(setData)
      .catch(() => message.error("Failed to load team availability"))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  useEffect(() => {
    leaveApi.getMyBalances().then(setBalances).catch(() => undefined);
    leaveApi.getLeaveContext().then((ctx) => setPeers(ctx.peers)).catch(() => undefined);
    expenseApi.listExpenseTypes().then(setExpenseTypes).catch(() => undefined);
  }, []);

  if (!hasPermission("team_dashboard.view")) {
    return (
      <div>
        <Title level={3}>Dashboard</Title>
        <Text type="secondary">You do not have permission to view the team dashboard.</Text>
      </div>
    );
  }

  const stats = data?.stats;
  const weekDates = data?.team[0]?.days.map((d) => d.date) ?? [];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
        <div>
          <Title level={3} style={{ margin: 0, letterSpacing: -0.3, color: appTokens.textPrimary }}>
            Team availability
          </Title>
          <Text style={{ color: appTokens.textSecondary, fontSize: 13.5 }}>
            {weekDates.length > 0
              ? `Week of ${dayjs(weekDates[0]).format("D")}–${dayjs(weekDates[6]).format("D MMM YYYY")} · leave and field activity per salesperson`
              : "Leave and field activity per salesperson"}
          </Text>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Button onClick={() => setLeaveOpen(true)}>Apply for leave</Button>
          <Button type="primary" onClick={() => setExpenseOpen(true)}>
            + New expense claim
          </Button>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
        <StatCard label="Available today" value={stats ? `${stats.availableToday} of ${stats.headcount}` : "—"} />
        <StatCard
          label="On leave"
          value={stats ? String(stats.onLeaveToday) : "—"}
          sub={stats && stats.onLeaveUnapprovedToday > 0 ? `${stats.onLeaveUnapprovedToday} unapproved` : undefined}
        />
        <StatCard
          label="Field visits today"
          value={stats ? String(stats.fieldVisitsToday) : "—"}
          sub={stats && stats.fieldVisitsPendingToday > 0 ? `${stats.fieldVisitsPendingToday} pending` : undefined}
        />
        <StatCard
          label="Avg activities / person"
          value={stats ? String(stats.avgActivitiesPerPerson) : "—"}
          sub={
            stats
              ? `${stats.avgActivitiesPerPerson - stats.avgActivitiesPerPersonLastWeek >= 0 ? "+" : ""}${
                  Math.round((stats.avgActivitiesPerPerson - stats.avgActivitiesPerPersonLastWeek) * 10) / 10
                } vs last week`
              : undefined
          }
        />
      </div>

      <div style={{ border: `1px solid ${appTokens.border}`, borderRadius: appTokens.radius, background: appTokens.surface, boxShadow: appTokens.shadowSm, overflow: "hidden" }}>
        <div style={{ padding: "14px 18px", borderBottom: `1px solid ${appTokens.borderLight}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
          <div>
            <Text strong style={{ fontSize: 14 }}>
              Availability calendar
            </Text>
            <div>
              <Text style={{ fontSize: 12, color: appTokens.textTertiary }}>
                Field/Office are real, from logged activities. Leave is real, from approved requests. Weekly off follows the same
                Sat/Sun convention the Leave module already uses.
              </Text>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {(Object.keys(TAG_LABEL) as TeamDayTag[])
              .filter((k) => k !== "none")
              .map((k) => (
                <div key={k} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: TAG_COLOR[k].fg }} />
                  <Text style={{ fontSize: 11.5, color: appTokens.textTertiary }}>{TAG_LABEL[k]}</Text>
                </div>
              ))}
          </div>
        </div>

        <div style={{ overflowX: "auto" }}>
          <div style={{ display: "flex", padding: "10px 18px", background: appTokens.surfaceMuted, borderBottom: `1px solid ${appTokens.borderLight}`, minWidth: 720 }}>
            <div style={{ width: 190, flexShrink: 0, fontSize: 10.5, fontWeight: 700, letterSpacing: 0.4, color: appTokens.textTertiary, textTransform: "uppercase" }}>
              Salesperson
            </div>
            {weekDates.map((date) => (
              <div key={date} style={{ flex: 1, textAlign: "center", fontSize: 10.5, fontWeight: 700, color: appTokens.textTertiary }}>
                <div style={{ textTransform: "uppercase", letterSpacing: 0.4 }}>{dayjs(date).format("ddd")}</div>
                <div style={{ fontSize: 12, color: appTokens.textPrimary, fontWeight: 700 }}>{dayjs(date).format("D")}</div>
              </div>
            ))}
            <div style={{ width: 70, flexShrink: 0, textAlign: "right", fontSize: 10.5, fontWeight: 700, letterSpacing: 0.4, color: appTokens.textTertiary, textTransform: "uppercase" }}>
              Load
            </div>
          </div>

          {!loading && data?.team.length === 0 && (
            <div style={{ padding: "40px 18px", textAlign: "center" }}>
              <Text style={{ fontSize: 13, color: appTokens.textTertiary }}>No direct reports yet.</Text>
            </div>
          )}

          {data?.team.map((member, idx) => (
            <div
              key={member.id}
              style={{
                display: "flex",
                alignItems: "center",
                padding: "12px 18px",
                minWidth: 720,
                borderBottom: idx === data.team.length - 1 ? "none" : `1px solid ${appTokens.borderLight}`,
              }}
            >
              <div style={{ width: 190, flexShrink: 0, display: "flex", alignItems: "center", gap: 10 }}>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    background: appTokens.primarySoft,
                    color: appTokens.primary,
                    fontSize: 11,
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  {initials(member.name)}
                </div>
                <div style={{ minWidth: 0 }}>
                  <Text strong style={{ fontSize: 13, display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {member.name}
                    {member.id === user?.id ? " (you)" : ""}
                  </Text>
                  <Text style={{ fontSize: 11, color: appTokens.textTertiary }}>{member.territory ?? "—"}</Text>
                </div>
              </div>
              {member.days.map((day) => (
                <div key={day.date} style={{ flex: 1, textAlign: "center" }}>
                  {day.tag === "none" ? (
                    <Text style={{ fontSize: 12, color: appTokens.textTertiary }}>—</Text>
                  ) : (
                    <Tooltip title={dayjs(day.date).format("D MMM YYYY")}>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "3px 10px",
                          borderRadius: 999,
                          fontSize: 11.5,
                          fontWeight: 600,
                          color: TAG_COLOR[day.tag].fg,
                          background: TAG_COLOR[day.tag].bg,
                        }}
                      >
                        {TAG_LABEL[day.tag]}
                      </span>
                    </Tooltip>
                  )}
                </div>
              ))}
              <div style={{ width: 70, flexShrink: 0, textAlign: "right" }}>
                <Text strong style={{ fontSize: 13 }}>
                  {member.loadThisWeek} act.
                </Text>
              </div>
            </div>
          ))}
        </div>
      </div>

      <ApplyForLeaveModal
        open={leaveOpen}
        onClose={() => setLeaveOpen(false)}
        onSubmitted={() => {
          setLeaveOpen(false);
          message.success("Leave request submitted");
          load();
        }}
        balances={balances}
        managerName={user?.managerName ?? null}
        peers={peers}
      />
      <NewExpenseClaimModal
        open={expenseOpen}
        onClose={() => setExpenseOpen(false)}
        onSubmitted={() => {
          setExpenseOpen(false);
          message.success("Expense claim submitted");
        }}
        types={expenseTypes}
        managerName={user?.managerName ?? null}
      />
    </div>
  );
}
