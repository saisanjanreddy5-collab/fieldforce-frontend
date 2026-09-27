import { useMemo } from "react";
import { Card, Tag, Typography } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import type { TeamMember } from "../types/user";
import type { Level } from "../types/level";
import { appTokens } from "../utils/design-system";
import { SPAN_WARNING_THRESHOLD } from "../utils/level-format";

const { Text } = Typography;

const FILLED_COLOR = appTokens.primary;
const VACANT_COLOR = appTokens.warning;
const SPAN_WARNING_COLOR = appTokens.danger;
const DOTTED_COLOR = appTokens.purple;

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

  const legendItem = (color: string, label: string) => (
    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
      <div style={{ width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0 }} />
      <Text style={{ fontSize: 11.5, color: appTokens.textTertiary }}>{label}</Text>
    </div>
  );

  return (
    <Card size="small" style={{ marginBottom: 16, borderColor: appTokens.border, boxShadow: appTokens.shadowSm }}>
      <Text strong>Org chart</Text>
      <div>
        <Text type="secondary" style={{ fontSize: 12 }}>
          Reporting structure, vacancies and span of control - computed live from People and Levels, nothing stored
          separately
        </Text>
      </div>

      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 12, marginBottom: 20 }}>
        {[
          { label: "Positions", value: String(stats.positions), subtitle: `${stats.levelsUsed} levels`, color: appTokens.textPrimary },
          { label: "Vacant", value: String(stats.vacant), subtitle: "open headcount", color: stats.vacant > 0 ? VACANT_COLOR : appTokens.textPrimary },
          {
            label: "Span warnings",
            value: String(stats.spanWarnings),
            subtitle: `over ${SPAN_WARNING_THRESHOLD} reports`,
            color: stats.spanWarnings > 0 ? SPAN_WARNING_COLOR : appTokens.textPrimary,
          },
          { label: "Dotted lines", value: String(stats.dottedLines), subtitle: "matrix links", color: appTokens.textPrimary },
        ].map((s) => (
          <div
            key={s.label}
            style={{
              flex: "1 1 160px",
              minWidth: 160,
              border: `1px solid ${appTokens.border}`,
              borderRadius: appTokens.radius,
              padding: "12px 14px",
              background: appTokens.surface,
              boxShadow: appTokens.shadowSm,
            }}
          >
            <Text style={{ fontSize: 11, fontWeight: 600, color: appTokens.textTertiary, display: "block" }}>{s.label}</Text>
            <div style={{ fontSize: 22, fontWeight: 700, color: s.color, letterSpacing: -0.3 }}>{s.value}</div>
            <Text style={{ fontSize: 11, color: appTokens.textTertiary }}>{s.subtitle}</Text>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
        <div>
          <Text strong style={{ fontSize: 13 }}>
            Reporting structure
          </Text>
          <div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Grouped by level - each card names its reporting manager, violet chips mark dotted-line (matrix) links
            </Text>
          </div>
        </div>
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
          {legendItem(FILLED_COLOR, "Filled")}
          {legendItem(VACANT_COLOR, "Vacant")}
          {legendItem(SPAN_WARNING_COLOR, "Span warning")}
          {legendItem(DOTTED_COLOR, "Dotted line")}
        </div>
      </div>

      {byLevel.map(({ level, people }, idx) => {
        const openCount = level.headcountLimit !== null ? Math.max(0, level.headcountLimit - level.currentHeadcount) : 0;
        const positionCount = people.length + openCount;
        return (
          <div key={level.id} style={{ marginBottom: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <Text style={{ fontSize: 11, fontWeight: 700, color: appTokens.textTertiary, textTransform: "uppercase", letterSpacing: 0.4 }}>
                L{idx + 1} · {level.name}
              </Text>
              {positionCount > 0 && (
                <Text style={{ fontSize: 11, color: appTokens.textTertiary }}>
                  {positionCount} position{positionCount === 1 ? "" : "s"}
                </Text>
              )}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 6 }}>
              {people.map((person) => {
                const reportCount = directReportCounts.get(person.id) ?? 0;
                const spanWarning = reportCount > SPAN_WARNING_THRESHOLD;
                const hasDotted = !!person.dottedLineManagerId;
                const managerName = nameOf(person.managerId);
                const dottedName = nameOf(person.dottedLineManagerId);
                const accentColor = spanWarning ? SPAN_WARNING_COLOR : hasDotted ? DOTTED_COLOR : FILLED_COLOR;
                return (
                  <div
                    key={person.id}
                    style={{
                      display: "flex",
                      minWidth: 220,
                      flex: "1 1 220px",
                      borderRadius: appTokens.radius,
                      background: appTokens.surface,
                      boxShadow: appTokens.shadowSm,
                      overflow: "hidden",
                      border: `1px solid ${appTokens.border}`,
                    }}
                  >
                    <div style={{ width: 4, flexShrink: 0, background: accentColor }} />
                    <div style={{ padding: "10px 12px", flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 6 }}>
                        <Text strong style={{ fontSize: 13 }}>
                          {person.name}
                        </Text>
                        {reportCount > 0 && (
                          <Text style={{ fontSize: 11, color: appTokens.textTertiary, flexShrink: 0 }}>
                            {reportCount} report{reportCount === 1 ? "" : "s"}
                          </Text>
                        )}
                      </div>
                      <Text style={{ fontSize: 11.5, color: appTokens.textTertiary, display: "block" }}>
                        {person.designation ?? level.name}
                      </Text>
                      {(spanWarning || dottedName) && (
                        <div style={{ marginTop: 5, display: "flex", gap: 4, flexWrap: "wrap" }}>
                          {spanWarning && (
                            <Tag style={{ color: SPAN_WARNING_COLOR, background: `${SPAN_WARNING_COLOR}14`, border: "none", fontSize: 10.5 }}>
                              span {reportCount}
                            </Tag>
                          )}
                          {dottedName && (
                            <Tag style={{ color: DOTTED_COLOR, background: `${DOTTED_COLOR}14`, border: "none", fontSize: 10.5 }}>
                              dotted → {dottedName}
                            </Tag>
                          )}
                        </div>
                      )}
                      {managerName && (
                        <Text style={{ fontSize: 11, color: appTokens.textTertiary, display: "block", marginTop: 5 }}>
                          ↳ Reports to {managerName}
                        </Text>
                      )}
                    </div>
                  </div>
                );
              })}
              {Array.from({ length: openCount }).map((_, i) => (
                <div
                  key={`open-${level.id}-${i}`}
                  style={{
                    display: "flex",
                    minWidth: 220,
                    flex: "1 1 220px",
                    borderRadius: appTokens.radius,
                    background: `${VACANT_COLOR}0a`,
                    overflow: "hidden",
                    border: `1px dashed ${VACANT_COLOR}55`,
                  }}
                >
                  <div style={{ width: 4, flexShrink: 0, background: VACANT_COLOR }} />
                  <div style={{ padding: "10px 12px", flex: 1, minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <PlusOutlined style={{ fontSize: 11, color: VACANT_COLOR }} />
                      <Text strong style={{ fontSize: 13, color: VACANT_COLOR }}>
                        Open position
                      </Text>
                    </div>
                    <Text style={{ fontSize: 11.5, color: appTokens.textTertiary }}>{level.name}</Text>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </Card>
  );
}
