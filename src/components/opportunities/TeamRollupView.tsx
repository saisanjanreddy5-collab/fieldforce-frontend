import { Avatar, Empty, Progress, Skeleton, Typography } from "antd";
import type { TeamRollupGroup, TeamRollupPerson } from "../../types/team-rollup";
import { formatCompactCurrency, initials } from "../../utils/lead-format";
import { appTokens, avatarGradient } from "../../utils/design-system";

const { Text, Title } = Typography;

function attainmentColor(percent: number): string {
  if (percent >= 100) return appTokens.success;
  if (percent >= 60) return appTokens.warning;
  return appTokens.danger;
}

function PersonRow({ person }: { person: TeamRollupPerson }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 90px 120px 180px",
        gap: 12,
        alignItems: "center",
        padding: "10px 18px",
        borderBottom: `1px solid ${appTokens.borderLight}`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
        <Avatar size={30} style={{ background: avatarGradient(person.name), fontSize: 12, fontWeight: 600, flexShrink: 0 }}>
          {initials(person.name)}
        </Avatar>
        <div style={{ minWidth: 0 }}>
          <Text strong style={{ fontSize: 13, display: "block", color: appTokens.textPrimary }}>
            {person.name}
          </Text>
          <Text style={{ fontSize: 11.5, color: appTokens.textTertiary }}>
            {[person.designation ?? (person.role === "manager" ? "Manager" : "Executive"), person.territory].filter(Boolean).join(" · ")}
          </Text>
        </div>
      </div>
      <Text style={{ fontSize: 13, color: appTokens.textSecondary }}>{person.openDeals} deal{person.openDeals === 1 ? "" : "s"}</Text>
      <Text strong style={{ fontSize: 13, color: appTokens.textPrimary }}>
        {formatCompactCurrency(person.pipeline)}
      </Text>
      {person.quota ? (
        <div>
          <Progress
            percent={Math.min(person.quota.attainmentPercent, 100)}
            showInfo={false}
            size="small"
            strokeColor={attainmentColor(person.quota.attainmentPercent)}
          />
          <Text style={{ fontSize: 11, color: attainmentColor(person.quota.attainmentPercent), fontWeight: 600 }}>
            {person.quota.attainmentPercent}% of {formatCompactCurrency(person.quota.targetAmount)}
          </Text>
        </div>
      ) : (
        <Text style={{ fontSize: 11.5, color: appTokens.textTertiary, fontStyle: "italic" }}>No target set this month</Text>
      )}
    </div>
  );
}

function GroupCard({ group }: { group: TeamRollupGroup }) {
  return (
    <div
      style={{
        border: `1px solid ${appTokens.border}`,
        borderRadius: appTokens.radius,
        background: appTokens.surface,
        boxShadow: appTokens.shadowXs,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 16,
          padding: "14px 18px",
          borderBottom: `1px solid ${appTokens.borderLight}`,
          background: appTokens.surfaceMuted,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Avatar size={34} shape="square" style={{ background: avatarGradient(group.managerName), borderRadius: 9, fontWeight: 600 }}>
            {initials(group.teamName ?? group.managerName)}
          </Avatar>
          <div>
            <Title level={5} style={{ margin: 0, color: appTokens.textPrimary }}>
              {[group.region, group.teamName].filter(Boolean).join(" · ") || "No sales team set"}
            </Title>
            <Text style={{ fontSize: 12, color: appTokens.textTertiary }}>
              Manager {group.managerName} · {group.people.length} people{group.territories.length > 0 ? ` · ${group.territories.join(", ")}` : ""}
            </Text>
          </div>
        </div>
        <div style={{ display: "flex", gap: 24 }}>
          {[
            { label: "OPEN DEALS", value: String(group.openDeals), color: appTokens.textPrimary },
            { label: "PIPELINE", value: formatCompactCurrency(group.pipeline), color: appTokens.textPrimary },
            { label: "WEIGHTED", value: formatCompactCurrency(group.weighted), color: appTokens.primary },
            { label: "WON MTD", value: formatCompactCurrency(group.wonMtd), color: appTokens.success },
          ].map((stat) => (
            <div key={stat.label}>
              <Text style={{ fontSize: 10, fontWeight: 600, color: appTokens.textTertiary, letterSpacing: 0.3, display: "block" }}>
                {stat.label}
              </Text>
              <Text strong style={{ fontSize: 14, color: stat.color }}>
                {stat.value}
              </Text>
            </div>
          ))}
        </div>
      </div>

      {group.people.map((person) => (
        <PersonRow key={person.id} person={person} />
      ))}
    </div>
  );
}

interface TeamRollupViewProps {
  groups: TeamRollupGroup[];
  loading: boolean;
}

export function TeamRollupView({ groups, loading }: TeamRollupViewProps) {
  if (loading) {
    return (
      <div style={{ border: `1px solid ${appTokens.border}`, borderRadius: appTokens.radius, padding: 20, background: appTokens.surface }}>
        <Skeleton active paragraph={{ rows: 5 }} />
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div style={{ border: `1px solid ${appTokens.border}`, borderRadius: appTokens.radius, padding: 48, background: appTokens.surface, textAlign: "center" }}>
        <Empty description="No teams to roll up - this needs at least one manager with direct reports in your scope" />
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {groups.map((group) => (
        <GroupCard key={group.managerId} group={group} />
      ))}
    </div>
  );
}
