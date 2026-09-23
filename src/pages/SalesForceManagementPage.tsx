import { useEffect, useMemo, useState } from "react";
import { Avatar, Button, Input, Progress, Space, Table, Tag, Typography, message } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import * as userApi from "../api/user-api";
import * as salesTeamApi from "../api/sales-team-api";
import * as officeApi from "../api/office-api";
import * as levelApi from "../api/level-api";
import * as targetApi from "../api/target-api";
import * as incentivePlanApi from "../api/incentive-plan-api";
import * as userIncentivePlanApi from "../api/user-incentive-plan-api";
import * as commissionRuleApi from "../api/commission-rule-api";
import type { TeamMember } from "../types/user";
import type { SalesTeam, Zone } from "../types/sales-team";
import type { Office } from "../types/office";
import type { Level } from "../types/level";
import type { Target } from "../types/target";
import type { IncentivePlan } from "../types/incentive-plan";
import type { UserIncentivePlan } from "../types/user-incentive-plan";
import { formatCompactCurrency, initials } from "../utils/lead-format";
import { resolveCurrentTarget } from "../utils/target-format";
import dayjs from "dayjs";
import { useHasPermission } from "../hooks/use-permission";
import { MicrosoftConnectionCard } from "../components/MicrosoftConnectionCard";
import { SalesTeamsCard } from "../components/SalesTeamsCard";
import { OfficesCard } from "../components/OfficesCard";
import { LevelsCard } from "../components/LevelsCard";
import { IncentivePlansCard } from "../components/IncentivePlansCard";
import { PermissionsCard } from "../components/PermissionsCard";
import { RolesAccessCard } from "../components/RolesAccessCard";
import { OrgChartCard } from "../components/OrgChartCard";
import { ReportingLinesCard } from "../components/ReportingLinesCard";
import { ApprovalBandsCard } from "../components/ApprovalBandsCard";
import { TerritoryTargetsCard } from "../components/TerritoryTargetsCard";
import { TestAccessAsModal } from "../components/TestAccessAsModal";
import { STATUS_COLORS, STATUS_OPTIONS, UserFormWizard } from "../components/UserFormWizard";
import { appTokens, avatarGradient } from "../utils/design-system";

const { Title, Text } = Typography;

function resolveCurrentIncentivePlan(userId: string, assignments: UserIncentivePlan[]): UserIncentivePlan | undefined {
  const today = dayjs().format("YYYY-MM-DD");
  return assignments.find(
    (a) => a.userId === userId && a.effectiveStartDate <= today && (a.effectiveEndDate === null || a.effectiveEndDate >= today)
  );
}

const BELOW_TARGET_THRESHOLD = 80;

type TabKey =
  | "people"
  | "offices"
  | "permissions"
  | "orgChart"
  | "levelsAxes"
  | "rolesAccess"
  | "reportingLines"
  | "approvalBands"
  | "territoryTargets";

export default function SalesForceManagementPage() {
  const hasPermission = useHasPermission();
  const [users, setUsers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [salesTeams, setSalesTeams] = useState<SalesTeam[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [offices, setOffices] = useState<Office[]>([]);
  const [levels, setLevels] = useState<Level[]>([]);
  const [targets, setTargets] = useState<Target[]>([]);
  const [incentivePlans, setIncentivePlans] = useState<IncentivePlan[]>([]);
  const [userIncentivePlans, setUserIncentivePlans] = useState<UserIncentivePlan[]>([]);
  const [commissionRuleNamesByPlan, setCommissionRuleNamesByPlan] = useState<Record<string, string[]>>({});
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<TeamMember | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [testAccessOpen, setTestAccessOpen] = useState(false);

  const load = () => {
    setLoading(true);
    userApi
      .listUsers()
      .then(setUsers)
      .catch(() => message.error("Failed to load team members"))
      .finally(() => setLoading(false));
  };

  const loadTargets = () => {
    targetApi.listTargets().then(setTargets).catch(() => undefined);
  };

  const loadIncentiveAssignments = () => {
    incentivePlanApi
      .listIncentivePlans()
      .then((plans) => {
        setIncentivePlans(plans);
        Promise.all(plans.map((p) => commissionRuleApi.listCommissionRules(p.id).then((rules) => [p.id, rules.map((r) => r.name)] as const)))
          .then((entries) => setCommissionRuleNamesByPlan(Object.fromEntries(entries)))
          .catch(() => undefined);
      })
      .catch(() => undefined);
    userIncentivePlanApi
      .listUserIncentivePlans()
      .then(setUserIncentivePlans)
      .catch(() => undefined);
  };

  useEffect(load, []);
  useEffect(loadTargets, []);
  useEffect(loadIncentiveAssignments, []);
  useEffect(() => {
    salesTeamApi.listZones().then(setZones).catch(() => undefined);
  }, []);
  // Fetched here rather than left to each tab's own card to populate via
  // onChange - those cards only mount when their own tab is active, so
  // relying on that left offices/salesTeams/levels empty everywhere else
  // (Permissions, Roles & access, Org chart, the People table's own
  // columns) until the user happened to visit that specific tab first.
  useEffect(() => {
    officeApi.listOffices().then(setOffices).catch(() => undefined);
  }, []);
  useEffect(() => {
    salesTeamApi.listSalesTeams().then(setSalesTeams).catch(() => undefined);
  }, []);
  useEffect(() => {
    levelApi.listLevels().then(setLevels).catch(() => undefined);
  }, []);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { active: 0, on_leave: 0, onboarding: 0, exited: 0 };
    for (const u of users) counts[u.status] = (counts[u.status] ?? 0) + 1;
    return counts;
  }, [users]);

  // Below-target and average attainment are both real averages/counts over
  // each active person's current target - no fabricated currency figure
  // here (an "incentive pool" total would need a real rate x achievement
  // computation engine, which doesn't exist anywhere in FieldForce yet).
  const belowTargetUserIds = useMemo(() => {
    const ids = new Set<string>();
    for (const u of users) {
      if (!u.isActive) continue;
      const current = resolveCurrentTarget(u.id, targets);
      if (current && current.achievementPercent < BELOW_TARGET_THRESHOLD) ids.add(u.id);
    }
    return ids;
  }, [users, targets]);

  const avgAttainment = useMemo(() => {
    const percents = users
      .filter((u) => u.isActive)
      .map((u) => resolveCurrentTarget(u.id, targets)?.achievementPercent)
      .filter((p): p is number => p !== undefined);
    if (percents.length === 0) return null;
    return Math.round(percents.reduce((acc, p) => acc + p, 0) / percents.length);
  }, [users, targets]);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      if (statusFilter === "below_target") {
        if (!belowTargetUserIds.has(u.id)) return false;
      } else if (statusFilter && u.status !== statusFilter) {
        return false;
      }
      if (!q) return true;
      return (
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.designation ?? "").toLowerCase().includes(q) ||
        (u.territory ?? "").toLowerCase().includes(q) ||
        (u.employeeCode ?? "").toLowerCase().includes(q)
      );
    });
  }, [users, search, statusFilter, belowTargetUserIds]);

  const openAddDrawer = () => {
    setEditingUser(null);
    setDrawerOpen(true);
  };

  const openEditDrawer = (user: TeamMember) => {
    setEditingUser(user);
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setEditingUser(null);
    // Targets are managed independently inside the drawer (their own
    // create/update/delete calls), so refresh the page-level summary once
    // the drawer closes to pick up anything changed in there.
    loadTargets();
  };

  const handleSaved = () => {
    closeDrawer();
    load();
  };

  // Sales teams and Incentive plans aren't their own tab in the reference -
  // Sales teams reads as a grouping of People, so it sits at the top of
  // that tab; Incentive plans is the shared catalog the Territory & targets
  // tab (and the wizard's own Targets & incentives section) both draw from,
  // so it sits there. Microsoft connection is a personal integration
  // setting, not an org-structure concept, so it stays outside the tabs
  // entirely rather than being forced into one.
  const TABS: { key: TabKey; label: string; visible: boolean }[] = [
    { key: "people", label: "People", visible: hasPermission("users.view") },
    { key: "offices", label: "Offices", visible: hasPermission("offices.view") },
    { key: "permissions", label: "Permissions", visible: hasPermission("role_permissions.view") },
    { key: "orgChart", label: "Org chart", visible: hasPermission("users.view") },
    { key: "levelsAxes", label: "Levels & axes", visible: hasPermission("levels.view") },
    { key: "rolesAccess", label: "Roles & access", visible: hasPermission("role_permissions.view") },
    { key: "reportingLines", label: "Reporting lines", visible: hasPermission("manager_change_log.view") },
    { key: "approvalBands", label: "Approval bands", visible: hasPermission("approval_bands.view") },
    { key: "territoryTargets", label: "Territory & targets", visible: hasPermission("targets.view") },
  ];
  const visibleTabs = TABS.filter((t) => t.visible);
  const [activeTab, setActiveTab] = useState<TabKey | null>(null);
  const currentTab = activeTab && visibleTabs.some((t) => t.key === activeTab) ? activeTab : visibleTabs[0]?.key ?? null;

  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
          <div>
            <Title level={3} style={{ margin: 0, letterSpacing: -0.3, color: appTokens.textPrimary }}>
              Sales force management
            </Title>
            <Text style={{ color: appTokens.textSecondary, fontSize: 13.5 }}>
              Every employee with targets, incentives, designation ladder and access, in one place
            </Text>
          </div>
          <Space wrap>
            {hasPermission("users.view") && (
              <Button shape="round" onClick={() => setTestAccessOpen(true)}>
                Test access as...
              </Button>
            )}
            {currentTab === "people" && hasPermission("users.create") && (
              <Button shape="round" type="primary" icon={<PlusOutlined />} onClick={openAddDrawer}>
                Create user
              </Button>
            )}
          </Space>
        </div>

        <MicrosoftConnectionCard />

        {visibleTabs.length > 0 && (
          <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 2 }}>
            {visibleTabs.map((tab) => {
              const active = currentTab === tab.key;
              return (
                <Button
                  key={tab.key}
                  size="small"
                  shape="round"
                  onClick={() => setActiveTab(tab.key)}
                  style={{
                    flexShrink: 0,
                    background: active ? appTokens.primarySoft : "transparent",
                    borderColor: active ? appTokens.primary : appTokens.border,
                    color: active ? appTokens.primary : appTokens.textPrimary,
                    fontWeight: active ? 700 : 500,
                  }}
                >
                  {tab.label}
                </Button>
              );
            })}
          </div>
        )}
      </div>

      {currentTab === "people" && (
        <>
          {hasPermission("sales_teams.view") && <SalesTeamsCard onChange={setSalesTeams} />}

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
            <div
              style={{
                flex: "1 1 160px",
                minWidth: 160,
                background: appTokens.surface,
                border: `1px solid ${appTokens.border}`,
                borderRadius: appTokens.radius,
                padding: "12px 16px",
                boxShadow: appTokens.shadowXs,
              }}
            >
              <Text style={{ fontSize: 11, fontWeight: 600, color: appTokens.textTertiary }}>People</Text>
              <div style={{ fontSize: 21, fontWeight: 700, lineHeight: 1.3, color: appTokens.textPrimary }}>{users.length}</div>
              <Text style={{ fontSize: 11, color: appTokens.textTertiary }}>on the sales force</Text>
            </div>
            <div
              style={{
                flex: "1 1 160px",
                minWidth: 160,
                background: "#fff8ec",
                border: "1px solid #ffe4ae",
                borderRadius: appTokens.radius,
                padding: "12px 16px",
              }}
            >
              <Text style={{ fontSize: 11, fontWeight: 600, color: appTokens.warning }}>Below target</Text>
              <div style={{ fontSize: 21, fontWeight: 700, lineHeight: 1.3, color: "#b56a00" }}>{belowTargetUserIds.size}</div>
              <Text style={{ fontSize: 11, color: appTokens.warning }}>under {BELOW_TARGET_THRESHOLD}%</Text>
            </div>
            <div
              style={{
                flex: "1 1 160px",
                minWidth: 160,
                background: appTokens.surface,
                border: `1px solid ${appTokens.border}`,
                borderRadius: appTokens.radius,
                padding: "12px 16px",
                boxShadow: appTokens.shadowXs,
              }}
            >
              <Text style={{ fontSize: 11, fontWeight: 600, color: appTokens.textTertiary }}>Incentive pool</Text>
              <div style={{ fontSize: 21, fontWeight: 700, lineHeight: 1.3, color: appTokens.textPrimary }}>-</div>
              <Text style={{ fontSize: 11, color: appTokens.textTertiary }}>no payout engine yet</Text>
            </div>
            <div
              style={{
                flex: "1 1 160px",
                minWidth: 160,
                background: "#f0faf2",
                border: "1px solid #c8ecd0",
                borderRadius: appTokens.radius,
                padding: "12px 16px",
              }}
            >
              <Text style={{ fontSize: 11, fontWeight: 600, color: appTokens.success }}>Avg attainment</Text>
              <div style={{ fontSize: 21, fontWeight: 700, lineHeight: 1.3, color: "#0d7a3d" }}>
                {avgAttainment === null ? "-" : `${avgAttainment}%`}
              </div>
              <Text style={{ fontSize: 11, color: appTokens.success }}>quota, current period</Text>
            </div>
          </div>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 12, alignItems: "center" }}>
            <Input.Search
              placeholder="Search people, designation, territory, employee code"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ maxWidth: 360 }}
              allowClear
            />
            <Space size={6} wrap>
              <Tag.CheckableTag checked={statusFilter === null} onChange={() => setStatusFilter(null)}>
                All {users.length}
              </Tag.CheckableTag>
              {STATUS_OPTIONS.map((s) => (
                <Tag.CheckableTag
                  key={s.value}
                  checked={statusFilter === s.value}
                  onChange={(checked) => setStatusFilter(checked ? s.value : null)}
                >
                  {s.label} {statusCounts[s.value] ?? 0}
                </Tag.CheckableTag>
              ))}
              <Tag.CheckableTag
                checked={statusFilter === "below_target"}
                onChange={(checked) => setStatusFilter(checked ? "below_target" : null)}
              >
                Below target {belowTargetUserIds.size}
              </Tag.CheckableTag>
            </Space>
          </div>

          <Table
            className="thin-scroll-table"
            size="small"
            rowKey="id"
            loading={loading}
            dataSource={filteredUsers}
            pagination={false}
            columns={[
              {
                title: "Employee",
                key: "employee",
                width: 190,
                render: (_, user) => {
                  const level = levels.find((l) => l.id === user.levelId);
                  const office = offices.find((o) => o.id === user.officeId);
                  const subtitle = [user.designation ?? level?.name ?? user.role, office?.name, user.employeeCode].filter(Boolean).join(" - ");
                  return (
                    <div style={{ display: "flex", gap: 8, alignItems: "center", overflow: "hidden" }}>
                      <Avatar size={28} style={{ background: avatarGradient(user.name), flexShrink: 0, fontSize: 12, fontWeight: 600 }}>
                        {initials(user.name)}
                      </Avatar>
                      <div style={{ minWidth: 0, overflow: "hidden" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <Text
                            strong
                            style={{ fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 85 }}
                            title={user.name}
                          >
                            {user.name}
                          </Text>
                          <Tag
                            color={STATUS_COLORS[user.status]}
                            style={{ fontSize: 10, lineHeight: "16px", padding: "0 6px", margin: 0, flexShrink: 0 }}
                          >
                            {STATUS_OPTIONS.find((s) => s.value === user.status)?.label ?? user.status}
                          </Tag>
                        </div>
                        <Text
                          type="secondary"
                          style={{ fontSize: 11, display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 150 }}
                          title={subtitle || undefined}
                        >
                          {subtitle || "-"}
                        </Text>
                      </div>
                    </div>
                  );
                },
              },
              {
                title: "Reports to",
                dataIndex: "managerId",
                width: 100,
                ellipsis: true,
                render: (managerId: string | null) => users.find((u) => u.id === managerId)?.name ?? "-",
              },
              {
                title: "Region / territory",
                key: "regionTerritory",
                width: 100,
                render: (_, user) => (
                  <div style={{ overflow: "hidden" }}>
                    <div style={{ fontSize: 12, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {zones.find((z) => z.id === user.zoneId)?.name ?? "-"}
                    </div>
                    <Text
                      type="secondary"
                      style={{ fontSize: 11, display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
                      title={user.territory ?? undefined}
                    >
                      {user.territory ?? "-"}
                    </Text>
                  </div>
                ),
              },
              {
                title: "Office",
                dataIndex: "officeId",
                width: 100,
                ellipsis: true,
                render: (officeId: string | null) => offices.find((o) => o.id === officeId)?.name ?? "-",
              },
              {
                title: "Target vs achieved",
                key: "targetVsAchieved",
                width: 140,
                render: (_, user) => {
                  const current = resolveCurrentTarget(user.id, targets);
                  if (!current) return "-";
                  return (
                    <div>
                      <Text style={{ fontSize: 12 }}>
                        {formatCompactCurrency(current.targetAmount)} / {formatCompactCurrency(current.achievedAmount)}
                      </Text>
                      <Progress
                        percent={Math.min(current.achievementPercent, 100)}
                        size="small"
                        showInfo={false}
                        strokeColor={current.achievementPercent < BELOW_TARGET_THRESHOLD ? "#e34948" : "#0ca30c"}
                      />
                    </div>
                  );
                },
              },
              {
                title: "Incentive",
                key: "incentivePlan",
                width: 95,
                ellipsis: true,
                render: (_, user) => {
                  const assignment = resolveCurrentIncentivePlan(user.id, userIncentivePlans);
                  if (!assignment) return "-";
                  return incentivePlans.find((p) => p.id === assignment.incentivePlanId)?.name ?? "-";
                },
              },
              {
                title: "Commission",
                key: "commissionRules",
                width: 95,
                ellipsis: true,
                render: (_, user) => {
                  const assignment = resolveCurrentIncentivePlan(user.id, userIncentivePlans);
                  if (!assignment) return "-";
                  const names = commissionRuleNamesByPlan[assignment.incentivePlanId] ?? [];
                  return names.length === 0 ? "-" : names.join(", ");
                },
              },
              {
                title: "Performance",
                key: "performance",
                width: 110,
                render: (_, user) => {
                  const current = resolveCurrentTarget(user.id, targets);
                  if (!current) return "-";
                  if (current.achievementPercent >= 100) return <Tag color="green">Exceeds</Tag>;
                  if (current.achievementPercent >= BELOW_TARGET_THRESHOLD) return <Tag color="blue">On track</Tag>;
                  return <Tag color="red">Below target</Tag>;
                },
              },
              {
                title: "",
                key: "action",
                width: 55,
                render: (_, user) =>
                  hasPermission("users.update") ? (
                    <Button type="link" size="small" onClick={() => openEditDrawer(user)}>
                      Edit
                    </Button>
                  ) : null,
              },
            ]}
          />
        </>
      )}

      {currentTab === "offices" && <OfficesCard zones={zones} onChange={setOffices} />}
      {currentTab === "permissions" && <PermissionsCard users={users} levels={levels} onLevelsChange={setLevels} />}
      {currentTab === "orgChart" && <OrgChartCard users={users} levels={levels} />}
      {currentTab === "levelsAxes" && <LevelsCard onChange={setLevels} />}
      {currentTab === "rolesAccess" && <RolesAccessCard users={users} levels={levels} onLevelsChange={setLevels} />}
      {currentTab === "reportingLines" && <ReportingLinesCard users={users} onUsersChange={load} />}
      {currentTab === "approvalBands" && <ApprovalBandsCard levels={levels} />}
      {currentTab === "territoryTargets" && (
        <>
          <TerritoryTargetsCard users={users} targets={targets} />
          {hasPermission("incentive_plans.view") && <IncentivePlansCard />}
        </>
      )}

      <UserFormWizard
        open={drawerOpen}
        user={editingUser}
        users={users}
        levels={levels}
        zones={zones}
        offices={offices}
        salesTeams={salesTeams}
        onClose={closeDrawer}
        onSaved={handleSaved}
      />

      <TestAccessAsModal open={testAccessOpen} onClose={() => setTestAccessOpen(false)} users={users} />
    </div>
  );
}
