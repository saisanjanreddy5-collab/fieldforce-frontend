import { useMemo } from "react";
import { Card, Tag, Typography } from "antd";
import type { TeamMember } from "../types/user";
import type { Level } from "../types/level";
import { appTokens } from "../utils/design-system";

const { Text } = Typography;

// A direct-report count above this is flagged as a span warning - the
// reference mockup used the same "over 8 reports" framing for its stat
// card, so that's the threshold reused here rather than inventing a new one.
const SPAN_WARNING_THRESHOLD = 8;

interface OrgChartCardProps {
  users: TeamMember[];
  levels: Level[];
}

// Entirely computed from users/levels already loaded elsewhere on this page
// - no new table, no new endpoint. "Vacant" only counts against a level's
// configured headcount_limit (Phase 3); levels with no limit set are
// unlimited and contribute nothing here, matching their own "unlimited"
// label in the Levels & axes card. There's no invented "open position"
// placeholder with a fake designation/territory - only the count is real.
export function OrgChartCard({ users, levels }: OrgChartCardProps) {
  const activeUsers = useMemo(() => users.filter((u) => u.isActive), [users]);

  const directReportCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const u of activeUsers) {
      if (!u.managerId) continue;
      counts.set(u.managerId, (counts.get(u.managerId) ?? 0) + 1);
    }
    return counts;
  }, [activeUsers]);

  const stats = useMemo(() => {
    const positions = activeUsers.filter((u) => u.levelId).length;
    const vacant = levels.reduce((sum, l) => {
      if (l.headcountLimit === null) return sum;
      return sum + Math.max(0, l.headcountLimit - l.currentHeadcount);
    }, 0);
    const spanWarnings = Array.from(directReportCounts.values()).filter((c) => c > SPAN_WARNING_THRESHOLD).length;
    const dottedLines = activeUsers.filter((u) => u.dottedLineManagerId).length;
    return { positions, levelsUsed: levels.filter((l) => l.currentHeadcount > 0).length, vacant, spanWarnings, dottedLines };
  }, [activeUsers, levels, directReportCounts]);

  const byLevel = useMemo(() => {
    return levels
      .map((level) => ({ level, people: activeUsers.filter((u) => u.levelId === level.id) }))
      .filter((group) => group.people.length > 0 || group.level.headcountLimit !== null);
  }, [levels, activeUsers]);

  const nameOf = (id: string | null) => (id ? users.find((u) => u.id === id)?.name ?? "Unknown" : null);

  return (
    <Card size="small" style={{ marginBottom: 16 }}>
      <Text strong>Org chart</Text>
      <div>
        <Text type="secondary" style={{ fontSize: 12 }}>
          Reporting structure, vacancies and span of control - computed live from People and Levels, nothing stored
          separately
        </Text>
      </div>

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 12, marginBottom: 16 }}>
        {[
          { label: "Positions", value: String(stats.positions), subtitle: `${stats.levelsUsed} levels` },
          { label: "Vacant", value: String(stats.vacant), subtitle: "open headcount" },
          { label: "Span warnings", value: String(stats.spanWarnings), subtitle: `over ${SPAN_WARNING_THRESHOLD} reports` },
          { label: "Dotted lines", value: String(stats.dottedLines), subtitle: "matrix links" },
        ].map((s) => (
          <div
            key={s.label}
            style={{
              flex: 1,
              minWidth: 130,
              border: `1px solid ${appTokens.border}`,
              borderRadius: appTokens.radius,
              padding: 12,
              background: appTokens.surface,
              boxShadow: appTokens.shadowXs,
            }}
          >
            <Text type="secondary" style={{ fontSize: 11 }}>
              {s.label}
            </Text>
            <div style={{ fontSize: 18, fontWeight: 600 }}>{s.value}</div>
            <Text type="secondary" style={{ fontSize: 11 }}>
              {s.subtitle}
            </Text>
          </div>
        ))}
      </div>

      {byLevel.map(({ level, people }, idx) => (
        <div key={level.id} style={{ marginBottom: 12 }}>
          <Text type="secondary" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 0.4 }}>
            L{idx + 1} · {level.name}
          </Text>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
            {people.map((person) => {
              const reportCount = directReportCounts.get(person.id) ?? 0;
              const spanWarning = reportCount > SPAN_WARNING_THRESHOLD;
              const managerName = nameOf(person.managerId);
              const dottedName = nameOf(person.dottedLineManagerId);
              return (
                <div
                  key={person.id}
                  style={{
                    border: `1px solid ${spanWarning ? appTokens.danger : appTokens.border}`,
                    borderRadius: appTokens.radius,
                    padding: 10,
                    minWidth: 200,
                    flex: "1 1 200px",
                    background: appTokens.surface,
                    boxShadow: appTokens.shadowXs,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <Text strong style={{ fontSize: 13 }}>
                        {person.name}
                      </Text>
                      <div>
                        <Text type="secondary" style={{ fontSize: 11 }}>
                          {person.designation ?? level.name}
                        </Text>
                      </div>
                    </div>
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      {reportCount > 0 ? `${reportCount} report${reportCount === 1 ? "" : "s"}` : ""}
                    </Text>
                  </div>
                  <div style={{ marginTop: 6, display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {managerName && <Text type="secondary" style={{ fontSize: 11 }}>Reports to {managerName}</Text>}
                  </div>
                  <div style={{ marginTop: 4, display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {spanWarning && <Tag color="red">span {reportCount}</Tag>}
                    {dottedName && <Tag color="purple">dotted → {dottedName}</Tag>}
                  </div>
                </div>
              );
            })}
            {level.headcountLimit !== null && level.headcountLimit > level.currentHeadcount && (
              <div
                style={{
                  border: `1px dashed ${appTokens.border}`,
                  borderRadius: appTokens.radius,
                  padding: 10,
                  minWidth: 200,
                  flex: "1 1 200px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: appTokens.textTertiary,
                }}
              >
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {level.headcountLimit - level.currentHeadcount} open position
                  {level.headcountLimit - level.currentHeadcount === 1 ? "" : "s"}
                </Text>
              </div>
            )}
          </div>
        </div>
      ))}
    </Card>
  );
}
