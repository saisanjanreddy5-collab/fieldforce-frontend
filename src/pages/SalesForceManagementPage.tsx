import { useEffect, useMemo, useState } from "react";
import { Button, Drawer, Form, Input, Progress, Select, Space, Table, Tag, Typography, message } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { isAxiosError } from "axios";
import dayjs from "dayjs";
import * as userApi from "../api/user-api";
import * as salesTeamApi from "../api/sales-team-api";
import * as targetApi from "../api/target-api";
import type { CreateUserPayload, TeamMember } from "../types/user";
import type { SalesTeam, Zone } from "../types/sales-team";
import type { Office } from "../types/office";
import type { Level } from "../types/level";
import type { PeriodType, Target } from "../types/target";
import { formatCompactCurrency } from "../utils/lead-format";
import { useHasPermission } from "../hooks/use-permission";
import { MicrosoftConnectionCard } from "../components/MicrosoftConnectionCard";
import { SalesTeamsCard } from "../components/SalesTeamsCard";
import { OfficesCard } from "../components/OfficesCard";
import { LevelsMiniCard } from "../components/LevelsMiniCard";
import { IncentivePlansCard } from "../components/IncentivePlansCard";
import { TargetsSection } from "../components/TargetsSection";

// annual > quarterly > monthly when more than one target is simultaneously
// active for the same person - a reasonable default for a single summary
// column; the drawer's Targets section always shows the full list.
const PERIOD_PRIORITY: Record<PeriodType, number> = { annual: 0, quarterly: 1, monthly: 2 };

function resolveCurrentTarget(userId: string, targets: Target[]): Target | undefined {
  const today = dayjs().format("YYYY-MM-DD");
  const active = targets.filter((t) => t.userId === userId && t.periodStart <= today && t.periodEnd >= today);
  return active.sort((a, b) => PERIOD_PRIORITY[a.periodType] - PERIOD_PRIORITY[b.periodType])[0];
}

const { Title, Text } = Typography;

const ROLE_OPTIONS = [
  { value: "admin", label: "Admin" },
  { value: "manager", label: "Manager" },
  { value: "agent", label: "Agent" },
];

const ROLE_COLORS: Record<string, string> = {
  admin: "purple",
  manager: "blue",
  agent: "default",
};

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "on_leave", label: "On leave" },
  { value: "onboarding", label: "Onboarding" },
];

const STATUS_COLORS: Record<string, string> = {
  active: "green",
  on_leave: "orange",
  onboarding: "blue",
};

interface FormValues {
  name: string;
  email: string;
  password: string;
  role: "admin" | "manager" | "agent";
  designation?: string;
  managerId?: string;
  smartfloAgentNumber?: string;
  territory?: string;
  salesTeamId?: string;
  zoneId?: string;
  employeeCode?: string;
  dateOfJoining?: string;
  status?: "active" | "on_leave" | "onboarding";
  levelId?: string;
  officeId?: string;
}

export default function SalesForceManagementPage() {
  const hasPermission = useHasPermission();
  const [users, setUsers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [salesTeams, setSalesTeams] = useState<SalesTeam[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [offices, setOffices] = useState<Office[]>([]);
  const [levels, setLevels] = useState<Level[]>([]);
  const [targets, setTargets] = useState<Target[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<TeamMember | null>(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [form] = Form.useForm<FormValues>();

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

  useEffect(load, []);
  useEffect(loadTargets, []);
  useEffect(() => {
    salesTeamApi.listZones().then(setZones).catch(() => undefined);
  }, []);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { active: 0, on_leave: 0, onboarding: 0 };
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
    form.resetFields();
    setDrawerOpen(true);
  };

  const openEditDrawer = (user: TeamMember) => {
    setEditingUser(user);
    form.setFieldsValue({
      designation: user.designation ?? undefined,
      managerId: user.managerId ?? undefined,
      smartfloAgentNumber: user.smartfloAgentNumber ?? undefined,
      territory: user.territory ?? undefined,
      salesTeamId: user.salesTeamId ?? undefined,
      zoneId: user.zoneId ?? undefined,
      employeeCode: user.employeeCode ?? undefined,
      dateOfJoining: user.dateOfJoining ?? undefined,
      status: user.status,
      levelId: user.levelId ?? undefined,
      officeId: user.officeId ?? undefined,
    });
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

  const handleSubmit = async (values: FormValues) => {
    setSaving(true);
    try {
      const shared = {
        designation: values.designation,
        managerId: values.managerId,
        smartfloAgentNumber: values.smartfloAgentNumber,
        territory: values.territory,
        salesTeamId: values.salesTeamId,
        zoneId: values.zoneId,
        employeeCode: values.employeeCode,
        dateOfJoining: values.dateOfJoining,
        status: values.status,
        levelId: values.levelId,
        officeId: values.officeId,
      };
      if (editingUser) {
        await userApi.updateUser(editingUser.id, shared);
        message.success("Account updated");
      } else {
        const payload: CreateUserPayload = {
          name: values.name,
          email: values.email,
          password: values.password,
          role: values.role,
          ...shared,
        };
        await userApi.createUser(payload);
        message.success("Account created");
      }
      form.resetFields();
      closeDrawer();
      load();
    } catch (err) {
      const description =
        isAxiosError<{ message?: string }>(err) && err.response?.data.message
          ? err.response.data.message
          : `Failed to ${editingUser ? "update" : "create"} account`;
      message.error(description);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>
            Sales force management
          </Title>
          <Text type="secondary">Your team's accounts, roles, and reporting lines</Text>
        </div>
        {hasPermission("users.create") && (
          <Button type="primary" icon={<PlusOutlined />} onClick={openAddDrawer}>
            Add user
          </Button>
        )}
      </div>

      <MicrosoftConnectionCard />
      {hasPermission("sales_teams.view") && <SalesTeamsCard onChange={setSalesTeams} />}
      {hasPermission("offices.view") && <OfficesCard zones={zones} onChange={setOffices} />}
      {hasPermission("levels.view") && <LevelsMiniCard onChange={setLevels} />}
      {hasPermission("incentive_plans.view") && <IncentivePlansCard />}

      {hasPermission("users.view") && (
        <>
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

      <Drawer
        title={editingUser ? `Edit ${editingUser.name}` : "Add user"}
        open={drawerOpen}
        onClose={closeDrawer}
        size="default"
        extra={
          <Space>
            <Button onClick={closeDrawer}>Cancel</Button>
            <Button type="primary" loading={saving} onClick={() => form.submit()}>
              {editingUser ? "Save changes" : "Create account"}
            </Button>
          </Space>
        }
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit} initialValues={{ status: "active" }}>
          {editingUser ? (
            <>
              <Text type="secondary" style={{ display: "block", marginBottom: 16 }}>
                {editingUser.email} · {editingUser.role}
              </Text>
              {hasPermission("targets.view") && <TargetsSection userId={editingUser.id} />}
            </>
          ) : (
            <>
              <Form.Item name="name" label="Name" rules={[{ required: true, message: "Name is required" }]}>
                <Input placeholder="Full name" />
              </Form.Item>
              <Form.Item
                name="email"
                label="Email"
                rules={[
                  { required: true, message: "Email is required" },
                  { type: "email", message: "Enter a valid email" },
                ]}
              >
                <Input placeholder="name@company.com" />
              </Form.Item>
              <Form.Item
                name="password"
                label="Password"
                rules={[
                  { required: true, message: "Password is required" },
                  { min: 8, message: "Must be at least 8 characters" },
                ]}
              >
                <Input.Password placeholder="At least 8 characters" />
              </Form.Item>
              <Form.Item name="role" label="Role" rules={[{ required: true, message: "Role is required" }]}>
                <Select options={ROLE_OPTIONS} placeholder="Select a role" />
              </Form.Item>
            </>
          )}
          <Form.Item name="employeeCode" label="Employee code">
            <Input placeholder="e.g. EMP-0041" />
          </Form.Item>
          <Form.Item name="dateOfJoining" label="Date of joining">
            <Input type="date" />
          </Form.Item>
          <Form.Item name="status" label="Status">
            <Select options={STATUS_OPTIONS} />
          </Form.Item>
          <Form.Item name="designation" label="Designation">
            <Input placeholder="e.g. Regional Sales Manager" />
          </Form.Item>
          <Form.Item name="levelId" label="Level">
            <Select
              allowClear
              placeholder="Select a level"
              options={levels.map((l) => ({ value: l.id, label: l.name }))}
            />
          </Form.Item>
          <Form.Item name="managerId" label="Reports to">
            <Select
              allowClear
              placeholder="Select a manager"
              options={users.map((u) => ({ value: u.id, label: u.name }))}
            />
          </Form.Item>
          <Form.Item name="zoneId" label="Region">
            <Select
              allowClear
              placeholder="Select a region"
              options={zones.map((z) => ({ value: z.id, label: z.name }))}
            />
          </Form.Item>
          <Form.Item
            name="territory"
            label="Territory"
            tooltip="A new lead is auto-assigned to whoever has this exact territory - must be unique per person"
          >
            <Input placeholder="e.g. Karnataka · Mysuru" />
          </Form.Item>
          <Form.Item name="officeId" label="Office">
            <Select
              allowClear
              placeholder="Select an office"
              options={offices
                .filter((o) => o.isActive || o.id === editingUser?.officeId)
                .map((o) => {
                  const region = zones.find((z) => z.id === o.zoneId)?.name ?? o.region;
                  const suffix = [region, o.isActive ? null : "inactive"].filter(Boolean).join(" · ");
                  return { value: o.id, label: suffix ? `${o.name} (${suffix})` : o.name };
                })}
            />
          </Form.Item>
          <Form.Item name="salesTeamId" label="Sales team">
            <Select
              allowClear
              placeholder="Select a sales team"
              options={salesTeams.map((t) => ({ value: t.id, label: t.region ? `${t.name} (${t.region})` : t.name }))}
            />
          </Form.Item>
          <Form.Item
            name="smartfloAgentNumber"
            label="Smartflo agent number"
            tooltip="Their own registered Smartflo agent number/mobile - required for the Call button to work"
          >
            <Input placeholder="e.g. 9876543210" />
          </Form.Item>
        </Form>
      </Drawer>
    </div>
  );
}
