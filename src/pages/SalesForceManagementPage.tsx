import { useEffect, useMemo, useState } from "react";
import { Button, Input, Progress, Space, Table, Tag, Typography, message } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import * as userApi from "../api/user-api";
import * as salesTeamApi from "../api/sales-team-api";
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
import { formatCompactCurrency } from "../utils/lead-format";
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
import { ROLE_COLORS, STATUS_COLORS, STATUS_OPTIONS, UserFormWizard } from "../components/UserFormWizard";

const { Title, Text } = Typography;

function resolveCurrentIncentivePlan(userId: string, assignments: UserIncentivePlan[]): UserIncentivePlan | undefined {
  const today = dayjs().format("YYYY-MM-DD");
  return assignments.find(
    (a) => a.userId === userId && a.effectiveStartDate <= today && (a.effectiveEndDate === null || a.effectiveEndDate >= today)
  );
}

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

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { active: 0, on_leave: 0, onboarding: 0, exited: 0 };
    for (const u of users) counts[u.status] = (counts[u.status] ?? 0) + 1;
    return counts;
  }, [users]);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      if (statusFilter && u.status !== statusFilter) return false;
      if (!q) return true;
      return (
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.designation ?? "").toLowerCase().includes(q) ||
        (u.territory ?? "").toLowerCase().includes(q) ||
        (u.employeeCode ?? "").toLowerCase().includes(q)
      );
    });
  }, [users, search, statusFilter]);

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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>
            Sales force management
          </Title>
          <Text type="secondary">Every employee with targets, incentives, designation ladder and access, in one place</Text>
        </div>
        <Space wrap>
          {hasPermission("users.view") && (
            <Button onClick={() => setTestAccessOpen(true)}>Test access as...</Button>
          )}
          {currentTab === "people" && hasPermission("users.create") && (
            <Button type="primary" icon={<PlusOutlined />} onClick={openAddDrawer}>
              Create user
            </Button>
          )}
        </Space>
      </div>

      <MicrosoftConnectionCard />

      {visibleTabs.length > 0 && (
        <Space size={8} wrap style={{ marginBottom: 16 }}>
          {visibleTabs.map((tab) => (
            <Button
              key={tab.key}
              shape="round"
              type={currentTab === tab.key ? "primary" : "default"}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </Button>
          ))}
        </Space>
      )}

      {currentTab === "people" && (
        <>
          {hasPermission("sales_teams.view") && <SalesTeamsCard onChange={setSalesTeams} />}

          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 16 }}>
            <div style={{ flex: 1, minWidth: 160, border: "1px solid #f0f0f0", borderRadius: 8, padding: 12 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                People
              </Text>
              <div style={{ fontSize: 20, fontWeight: 600 }}>{users.length}</div>
              <Text type="secondary" style={{ fontSize: 11 }}>
                on the sales force
              </Text>
            </div>
          </div>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16, alignItems: "center" }}>
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
            </Space>
          </div>

          <Table
            rowKey="id"
            loading={loading}
            dataSource={filteredUsers}
            pagination={false}
            scroll={{ x: 1900 }}
            columns={[
              { title: "Name", dataIndex: "name" },
              { title: "Employee code", dataIndex: "employeeCode", render: (v: string | null) => v ?? "-" },
              { title: "Email", dataIndex: "email" },
              {
                title: "Role",
                dataIndex: "role",
                render: (role: string) => <Tag color={ROLE_COLORS[role]}>{role}</Tag>,
              },
              {
                title: "Status",
                dataIndex: "status",
                render: (status: string) => <Tag color={STATUS_COLORS[status]}>{STATUS_OPTIONS.find((s) => s.value === status)?.label ?? status}</Tag>,
              },
              { title: "Designation", dataIndex: "designation", render: (v: string | null) => v ?? "-" },
              {
                title: "Level",
                dataIndex: "levelId",
                render: (levelId: string | null) => levels.find((l) => l.id === levelId)?.name ?? "-",
              },
              {
                title: "Region",
                dataIndex: "zoneId",
                render: (zoneId: string | null) => zones.find((z) => z.id === zoneId)?.name ?? "-",
              },
              { title: "Territory", dataIndex: "territory", render: (v: string | null) => v ?? "-" },
              {
                title: "Office",
                dataIndex: "officeId",
                render: (officeId: string | null) => offices.find((o) => o.id === officeId)?.name ?? "-",
              },
              {
                title: "Sales team",
                dataIndex: "salesTeamId",
                render: (salesTeamId: string | null) => salesTeams.find((t) => t.id === salesTeamId)?.name ?? "-",
              },
              {
                title: "Incentive plan",
                key: "incentivePlan",
                render: (_, user) => {
                  const assignment = resolveCurrentIncentivePlan(user.id, userIncentivePlans);
                  if (!assignment) return "-";
                  return incentivePlans.find((p) => p.id === assignment.incentivePlanId)?.name ?? "-";
                },
              },
              {
                title: "Commission rules",
                key: "commissionRules",
                render: (_, user) => {
                  const assignment = resolveCurrentIncentivePlan(user.id, userIncentivePlans);
                  if (!assignment) return "-";
                  const names = commissionRuleNamesByPlan[assignment.incentivePlanId] ?? [];
                  return names.length === 0 ? "-" : names.join(", ");
                },
              },
              {
                title: "Target",
                key: "target",
                render: (_, user) => {
                  const current = resolveCurrentTarget(user.id, targets);
                  return current ? formatCompactCurrency(current.targetAmount) : "-";
                },
              },
              {
                title: "Achieved",
                key: "achieved",
                render: (_, user) => {
                  const current = resolveCurrentTarget(user.id, targets);
                  return current ? formatCompactCurrency(current.achievedAmount) : "-";
                },
              },
              {
                title: "Achievement %",
                key: "achievementPercent",
                width: 140,
                render: (_, user) => {
                  const current = resolveCurrentTarget(user.id, targets);
                  if (!current) return "-";
                  return <Progress percent={Math.min(current.achievementPercent, 100)} size="small" format={() => `${current.achievementPercent}%`} />;
                },
              },
              { title: "Date of joining", dataIndex: "dateOfJoining", render: (v: string | null) => v ?? "-" },
              { title: "Smartflo agent", dataIndex: "smartfloAgentNumber", render: (v: string | null) => v ?? "-" },
              {
                title: "Reports to",
                dataIndex: "managerId",
                render: (managerId: string | null) => users.find((u) => u.id === managerId)?.name ?? "-",
              },
              {
                title: "",
                key: "action",
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
      {currentTab === "permissions" && <PermissionsCard users={users} />}
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
