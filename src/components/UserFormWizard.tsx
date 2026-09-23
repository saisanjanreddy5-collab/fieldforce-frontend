import { useEffect, useState } from "react";
import { Avatar, Button, Drawer, Form, Input, Radio, Select, Space, Tabs, Tag, Typography, message } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { isAxiosError } from "axios";
import * as userApi from "../api/user-api";
import * as salesTeamApi from "../api/sales-team-api";
import * as classificationApi from "../api/classification-api";
import type { CreateUserPayload, TeamMember, UserStatus } from "../types/user";
import type { SalesTeam, State, Zone } from "../types/sales-team";
import type { Office } from "../types/office";
import type { Level } from "../types/level";
import type { CustomerCategory, DivisionChannel } from "../types/classification";
import { useHasPermission } from "../hooks/use-permission";
import { ladderIndex } from "../utils/level-format";
import { initials } from "../utils/lead-format";
import { appTokens, avatarGradient } from "../utils/design-system";
import { TargetsSection } from "./TargetsSection";
import { IncentivePlanSection } from "./IncentivePlanSection";
import { UserCommissionSection } from "./UserCommissionSection";

const { Text } = Typography;

// Same span-warning threshold Org chart uses for "too many direct
// reports" - surfaced here too, inline in the manager picker, so an admin
// sees the same warning before they create the overload rather than after.
const SPAN_WARNING_THRESHOLD = 8;

// Kept for the People table's role chip - accounts still get one of these 3
// real tiers, just derived from the selected Level now rather than picked
// directly in this wizard (see level-service.ts's getLevelSecurityTier).
export const ROLE_OPTIONS = [
  { value: "admin", label: "Admin" },
  { value: "manager", label: "Manager" },
  { value: "agent", label: "Agent" },
];

export const ROLE_COLORS: Record<string, string> = {
  admin: "purple",
  manager: "blue",
  agent: "default",
};

export const STATUS_OPTIONS: { value: UserStatus; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "on_leave", label: "On leave" },
  { value: "onboarding", label: "Onboarding" },
  { value: "exited", label: "Exited" },
];

export const STATUS_COLORS: Record<string, string> = {
  active: "green",
  on_leave: "orange",
  onboarding: "blue",
  exited: "default",
};

interface FormValues {
  name: string;
  email: string;
  password: string;
  employeeCode: string;
  mobile: string;
  dateOfJoining?: string;
  status?: UserStatus;
  designation?: string;
  levelId: string;
  managerId?: string;
  dottedLineManagerId?: string;
  zoneId?: string;
  stateId?: string;
  territory?: string;
  officeId?: string;
  salesTeamId?: string;
  smartfloAgentNumber?: string;
  divisionChannelId?: string;
  customerCategoryId?: string;
}

interface UserFormWizardProps {
  open: boolean;
  user: TeamMember | null;
  users: TeamMember[];
  levels: Level[];
  zones: Zone[];
  offices: Office[];
  salesTeams: SalesTeam[];
  onClose: () => void;
  onSaved: () => void;
}

// A tinted section card - icon + colored title + subtitle, matching the
// reference's "Identity & login" / "Position & manager" / "Geography &
// office" / "Sales target" / "Incentives" / "Commissions" treatment,
// instead of a plain heading floating above a flat field list.
function SectionCard({
  icon,
  title,
  subtitle,
  color,
  background,
  extra,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  color: string;
  background: string;
  extra?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div style={{ background, border: `1px solid ${color}22`, borderRadius: appTokens.radius, padding: 16, marginBottom: 16, boxShadow: appTokens.shadowXs }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10, gap: 8 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
          <div
            style={{
              width: 22,
              height: 22,
              borderRadius: 6,
              background: `${color}22`,
              color,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              fontSize: 12,
            }}
          >
            {icon}
          </div>
          <div>
            <Text strong style={{ color, display: "block", fontSize: 13 }}>
              {title}
            </Text>
            <Text type="secondary" style={{ fontSize: 11 }}>
              {subtitle}
            </Text>
          </div>
        </div>
        {extra}
      </div>
      {children}
    </div>
  );
}

// Live mini org-chart preview: shows the selected manager's own manager
// (skip level) and the manager themselves, above a "this user" placeholder.
// Purely a UX preview - it never decides authorization; the backend's
// manager_id subtree is what actually governs record visibility.
function OrgChartPreview({
  managerId,
  users,
  levels,
  name,
  designation,
}: {
  managerId: string | undefined;
  users: TeamMember[];
  levels: Level[];
  name: string | undefined;
  designation: string | undefined;
}) {
  if (!managerId) {
    return (
      <Text type="secondary" style={{ fontSize: 12 }}>
        Pick a manager below to preview where this person sits.
      </Text>
    );
  }

  const manager = users.find((u) => u.id === managerId);
  if (!manager) return null;
  const skipLevel = manager.managerId ? users.find((u) => u.id === manager.managerId) : undefined;
  const levelName = (levelId: string | null) => levels.find((l) => l.id === levelId)?.name;

  const row = (label: string, personName: string, personDesignation?: string | null, tagColor?: string) => (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "6px 10px",
        border: `1px solid ${appTokens.border}`,
        borderRadius: appTokens.radiusSm,
        marginBottom: 4,
        background: appTokens.surface,
      }}
    >
      <div>
        <Text strong style={{ fontSize: 13 }}>
          {personName}
        </Text>
        <div>
          <Text type="secondary" style={{ fontSize: 11 }}>
            {personDesignation || "Designation not set"}
          </Text>
        </div>
      </div>
      <Tag color={tagColor}>{label}</Tag>
    </div>
  );

  return (
    <div style={{ marginBottom: 4 }}>
      {skipLevel && row("skip level", skipLevel.name, skipLevel.designation ?? levelName(skipLevel.levelId))}
      {row("manager", manager.name, manager.designation ?? levelName(manager.levelId), "blue")}
      {row("this user", name?.trim() || "New user", designation, "green")}
      <Text type="secondary" style={{ fontSize: 11 }}>
        Ownership follows this line: {manager.name} and everyone above will see this person&apos;s records. Peers see
        aggregates only.
      </Text>
    </div>
  );
}

export function UserFormWizard({ open, user, users, levels, zones, offices, salesTeams, onClose, onSaved }: UserFormWizardProps) {
  const hasPermission = useHasPermission();
  const [form] = Form.useForm<FormValues>();
  const [saving, setSaving] = useState(false);
  const [states, setStates] = useState<State[]>([]);
  const [divisionChannels, setDivisionChannels] = useState<DivisionChannel[]>([]);
  const [customerCategories, setCustomerCategories] = useState<CustomerCategory[]>([]);
  const [managerPickerExpanded, setManagerPickerExpanded] = useState(true);

  const zoneId = Form.useWatch("zoneId", form);
  const managerId = Form.useWatch("managerId", form);
  const levelId = Form.useWatch("levelId", form);
  const nameWatch = Form.useWatch("name", form);
  const designationWatch = Form.useWatch("designation", form);

  useEffect(() => {
    if (!open) return;
    classificationApi.listDivisionChannels().then(setDivisionChannels).catch(() => undefined);
    classificationApi.listCustomerCategories().then(setCustomerCategories).catch(() => undefined);
    setManagerPickerExpanded(true);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (user) {
      form.setFieldsValue({
        employeeCode: user.employeeCode ?? undefined,
        mobile: user.mobile ?? undefined,
        dateOfJoining: user.dateOfJoining ?? undefined,
        status: user.status,
        designation: user.designation ?? undefined,
        levelId: user.levelId ?? undefined,
        managerId: user.managerId ?? undefined,
        dottedLineManagerId: user.dottedLineManagerId ?? undefined,
        zoneId: user.zoneId ?? undefined,
        stateId: user.stateId ?? undefined,
        territory: user.territory ?? undefined,
        officeId: user.officeId ?? undefined,
        salesTeamId: user.salesTeamId ?? undefined,
        smartfloAgentNumber: user.smartfloAgentNumber ?? undefined,
        divisionChannelId: user.divisionChannelId ?? undefined,
        customerCategoryId: user.customerCategoryId ?? undefined,
      });
    } else {
      form.resetFields();
    }
  }, [open, user, form]);

  // Clearing a stale state selection is decided against the freshly
  // resolved list, not the `states` state variable - checking against that
  // instead would race the fetch (it still holds the previous zone's list,
  // or the initial empty array, for one render after zoneId changes) and
  // could wipe out a just-hydrated edit-mode value before its own zone's
  // states had even loaded.
  useEffect(() => {
    if (!open) return;
    salesTeamApi
      .listStates(zoneId || undefined)
      .then((fetchedStates) => {
        setStates(fetchedStates);
        const current = form.getFieldValue("stateId");
        if (current && !fetchedStates.some((s) => s.id === current)) {
          form.setFieldValue("stateId", undefined);
        }
      })
      .catch(() => setStates([]));
  }, [open, zoneId, form]);

  const selectedLevel = levels.find((l) => l.id === levelId);
  const managerCandidates = selectedLevel
    ? users.filter((u) => {
        if (user && u.id === user.id) return false;
        const uLevel = levels.find((l) => l.id === u.levelId);
        return uLevel ? uLevel.sortOrder < selectedLevel.sortOrder : false;
      })
    : users.filter((u) => !user || u.id !== user.id);
  const directReportCounts = new Map<string, number>();
  for (const u of users) {
    if (!u.managerId) continue;
    directReportCounts.set(u.managerId, (directReportCounts.get(u.managerId) ?? 0) + 1);
  }
  const ladderLevels = levels.filter((l) => !l.isCrossCutting).slice().sort((a, b) => a.sortOrder - b.sortOrder);

  const handleSubmit = async (values: FormValues) => {
    setSaving(true);
    try {
      const shared = {
        designation: values.designation,
        managerId: values.managerId,
        dottedLineManagerId: values.dottedLineManagerId,
        smartfloAgentNumber: values.smartfloAgentNumber,
        mobile: values.mobile,
        territory: values.territory,
        salesTeamId: values.salesTeamId,
        zoneId: values.zoneId,
        stateId: values.stateId,
        employeeCode: values.employeeCode,
        dateOfJoining: values.dateOfJoining,
        status: values.status,
        levelId: values.levelId,
        officeId: values.officeId,
        divisionChannelId: values.divisionChannelId,
        customerCategoryId: values.customerCategoryId,
      };
      if (user) {
        await userApi.updateUser(user.id, shared);
        message.success("Account updated");
      } else {
        const payload: CreateUserPayload = {
          name: values.name,
          email: values.email,
          password: values.password,
          ...shared,
        };
        await userApi.createUser(payload);
        message.success("Account created");
      }
      onSaved();
    } catch (err) {
      const description =
        isAxiosError<{ message?: string }>(err) && err.response?.data.message
          ? err.response.data.message
          : `Failed to ${user ? "update" : "create"} account`;
      message.error(description);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer
      title={
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: appTokens.radiusSm,
              background: `linear-gradient(135deg, ${appTokens.primary}, #3f6fef)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              boxShadow: "0 2px 6px rgba(19,84,224,0.3)",
            }}
          >
            <PlusOutlined style={{ color: "#fff" }} />
          </div>
          <div>
            <Text strong style={{ fontSize: 16, display: "block" }}>
              {user ? `Edit ${user.name}` : "Create user"}
            </Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Identity, position, geography, targets and incentives
            </Text>
          </div>
        </div>
      }
      open={open}
      onClose={onClose}
      size="large"
      footer={
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            The org chart updates the moment the manager is set
          </Text>
          <Space>
            <Button onClick={onClose}>Cancel</Button>
            <Button type="primary" loading={saving} onClick={() => form.submit()}>
              {user ? "Save changes" : "Create user"}
            </Button>
          </Space>
        </div>
      }
    >
      <Form<FormValues> form={form} layout="vertical" onFinish={handleSubmit} initialValues={{ status: "active" }}>
        <Tabs
          items={[
            {
              key: "identity",
              label: "Identity",
              children: (
                <SectionCard
                  icon="@"
                  title="Identity & login"
                  subtitle="Who they are and how they sign in"
                  color={appTokens.primary}
                  background={appTokens.primarySoft}
                >
                  {user ? (
                    <Text type="secondary" style={{ display: "block", marginBottom: 12 }}>
                      {user.email} · {user.role}
                    </Text>
                  ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
                      <Form.Item name="name" label="Full name" rules={[{ required: true, message: "Name is required" }]}>
                        <Input placeholder="e.g. Neha Sharma" />
                      </Form.Item>
                      <Form.Item name="employeeCode" label="Employee code" rules={[{ required: true, message: "Employee code is required" }]}>
                        <Input placeholder="e.g. EMP-0041" />
                      </Form.Item>
                      <Form.Item
                        name="email"
                        label="Work email"
                        rules={[
                          { required: true, message: "Email is required" },
                          { type: "email", message: "Enter a valid email" },
                        ]}
                      >
                        <Input placeholder="neha.sharma@company.com" />
                      </Form.Item>
                      <Form.Item name="mobile" label="Mobile" rules={[{ required: true, message: "Mobile is required" }]}>
                        <Input placeholder="e.g. +91 98xxx xxxxx" />
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
                    </div>
                  )}
                  {user && (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
                      <Form.Item name="employeeCode" label="Employee code" rules={[{ required: true, message: "Employee code is required" }]}>
                        <Input placeholder="e.g. EMP-0041" />
                      </Form.Item>
                      <Form.Item name="mobile" label="Mobile" rules={[{ required: true, message: "Mobile is required" }]}>
                        <Input placeholder="e.g. +91 98xxx xxxxx" />
                      </Form.Item>
                    </div>
                  )}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
                    <Form.Item name="dateOfJoining" label="Date of joining">
                      <Input type="date" />
                    </Form.Item>
                    <Form.Item name="status" label="Status">
                      <Select options={STATUS_OPTIONS} />
                    </Form.Item>
                  </div>
                </SectionCard>
              ),
            },
            {
              key: "position",
              label: "Position & geography",
              children: (
                <>
                  <Form.Item name="managerId" hidden>
                    <Input />
                  </Form.Item>
                  <SectionCard
                    icon="◆"
                    title="Where they sit"
                    subtitle="Chart preview updates as you pick the manager"
                    color={appTokens.primary}
                    background={appTokens.primarySoft}
                  >
                    <OrgChartPreview managerId={managerId} users={users} levels={levels} name={nameWatch} designation={designationWatch} />
                  </SectionCard>

                  <SectionCard
                    icon="⇄"
                    title="Assign a reporting manager"
                    subtitle="Pick from managers above this level"
                    color={appTokens.primary}
                    background={appTokens.primarySoft}
                    extra={
                      <Button type="link" size="small" style={{ padding: 0 }} onClick={() => setManagerPickerExpanded((v) => !v)}>
                        {managerPickerExpanded ? "Done" : "Change"}
                      </Button>
                    }
                  >
                    {managerPickerExpanded ? (
                      managerCandidates.length === 0 ? (
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          No one above this level yet - pick a Level first, or leave blank for the top of the hierarchy.
                        </Text>
                      ) : (
                        <div style={{ maxHeight: 320, overflowY: "auto", paddingRight: 2 }}>
                          {managerCandidates.map((u) => {
                            const span = directReportCounts.get(u.id) ?? 0;
                            const uLevel = levels.find((l) => l.id === u.levelId);
                            const selected = managerId === u.id;
                            return (
                              <div
                                key={u.id}
                                onClick={() => form.setFieldValue("managerId", u.id)}
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  padding: "8px 10px",
                                  border: `1px solid ${selected ? appTokens.primary : appTokens.border}`,
                                  borderRadius: appTokens.radiusSm,
                                  marginBottom: 6,
                                  cursor: "pointer",
                                  background: selected ? appTokens.primarySoft : appTokens.surface,
                                }}
                              >
                                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                                  <Avatar size={28} style={{ background: avatarGradient(u.name), flexShrink: 0, fontSize: 12, fontWeight: 600 }}>
                                    {initials(u.name)}
                                  </Avatar>
                                  <div>
                                    <Text strong style={{ fontSize: 13 }}>
                                      {u.name}
                                    </Text>
                                    <div>
                                      <Text type="secondary" style={{ fontSize: 11 }}>
                                        {u.designation || uLevel?.name || u.role}
                                      </Text>
                                    </div>
                                  </div>
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                  {span > SPAN_WARNING_THRESHOLD && (
                                    <Tag color="gold" style={{ marginRight: 0 }}>
                                      span {span}
                                    </Tag>
                                  )}
                                  <Radio checked={selected} onChange={() => form.setFieldValue("managerId", u.id)} />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )
                    ) : (
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        {(() => {
                          const selectedManager = users.find((u) => u.id === managerId);
                          if (!selectedManager) return <Text type="secondary">No manager selected</Text>;
                          return (
                            <>
                              <Avatar size={28} style={{ background: avatarGradient(selectedManager.name), fontSize: 12, fontWeight: 600 }}>
                                {initials(selectedManager.name)}
                              </Avatar>
                              <div>
                                <Text strong style={{ fontSize: 13 }}>
                                  {selectedManager.name}
                                </Text>
                                <div>
                                  <Text type="secondary" style={{ fontSize: 11 }}>
                                    {selectedManager.designation || levels.find((l) => l.id === selectedManager.levelId)?.name}
                                  </Text>
                                </div>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    )}
                  </SectionCard>

                  <SectionCard
                    icon="◇"
                    title="Position & manager"
                    subtitle="Drives the org chart and data ownership"
                    color={appTokens.purple}
                    background="#f8f4fd"
                  >
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
                      <Form.Item name="designation" label="Designation">
                        <Input placeholder="e.g. Regional Sales Manager" />
                      </Form.Item>
                      <Form.Item
                        name="levelId"
                        label="Level"
                        tooltip="Ladder position - also determines their real backend access tier"
                        rules={[{ required: true, message: "Level is required" }]}
                      >
                        <Select
                          placeholder="Select a level"
                          options={ladderLevels.map((l) => ({ value: l.id, label: `L${ladderIndex(l, levels)} · ${l.name}` }))}
                        />
                      </Form.Item>
                      <Form.Item
                        label="Role"
                        tooltip="Same underlying Level, shown against the full list including Administrator and Finance"
                      >
                        <Select
                          placeholder="Select a role"
                          value={levelId || undefined}
                          onChange={(v) => form.setFieldValue("levelId", v)}
                          options={levels.map((l) => ({ value: l.id, label: l.name }))}
                        />
                      </Form.Item>
                      <Form.Item name="dottedLineManagerId" label="Dotted-line to (optional)">
                        <Select
                          allowClear
                          showSearch
                          optionFilterProp="label"
                          placeholder="Select a secondary reporting line"
                          options={users.filter((u) => !user || u.id !== user.id).map((u) => ({ value: u.id, label: u.name }))}
                        />
                      </Form.Item>
                    </div>
                  </SectionCard>

                  <SectionCard
                    icon="⌖"
                    title="Geography & office"
                    subtitle="Region, state, territory and where they sit"
                    color={appTokens.success}
                    background="#f1faf1"
                  >
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
                      <Form.Item name="zoneId" label="Region">
                        <Select allowClear placeholder="Select a region" options={zones.map((z) => ({ value: z.id, label: z.name }))} />
                      </Form.Item>
                      <Form.Item name="stateId" label="State">
                        <Select
                          allowClear
                          showSearch
                          optionFilterProp="label"
                          placeholder={zoneId ? "Select a state" : "Select a region first"}
                          disabled={!zoneId}
                          options={states.map((s) => ({ value: s.id, label: s.name }))}
                        />
                      </Form.Item>
                    </div>
                    <Form.Item
                      name="territory"
                      label="Territory"
                      tooltip="A new lead is auto-assigned to whoever has this exact territory - must be unique per person"
                    >
                      <Input placeholder="e.g. Karnataka · Mysuru" />
                    </Form.Item>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
                      <Form.Item name="officeId" label="Office location">
                        <Select
                          allowClear
                          placeholder="Select an office"
                          options={offices
                            .filter((o) => o.isActive || o.id === user?.officeId)
                            .map((o) => {
                              const region = zones.find((z) => z.id === o.zoneId)?.name ?? o.region;
                              const suffix = [region, o.isActive ? null : "inactive"].filter(Boolean).join(" · ");
                              return { value: o.id, label: suffix ? `${o.name} (${suffix})` : o.name };
                            })}
                        />
                      </Form.Item>
                      <Form.Item name="divisionChannelId" label="Division / channel">
                        <Select
                          allowClear
                          placeholder="Select a division / channel"
                          options={divisionChannels.map((d) => ({ value: d.id, label: d.label }))}
                        />
                      </Form.Item>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
                      <Form.Item name="customerCategoryId" label="Customer category">
                        <Select
                          allowClear
                          placeholder="Select a customer category"
                          options={customerCategories.map((c) => ({ value: c.id, label: c.label }))}
                        />
                      </Form.Item>
                      <Form.Item name="salesTeamId" label="Sales team">
                        <Select
                          allowClear
                          placeholder="Select a sales team"
                          options={salesTeams.map((t) => ({ value: t.id, label: t.region ? `${t.name} (${t.region})` : t.name }))}
                        />
                      </Form.Item>
                    </div>
                    <Form.Item
                      name="smartfloAgentNumber"
                      label="Smartflo agent number"
                      tooltip="Their own registered Smartflo agent number/mobile - required for the Call button to work"
                    >
                      <Input placeholder="e.g. 9876543210" />
                    </Form.Item>
                  </SectionCard>
                </>
              ),
            },
            {
              key: "targets",
              label: "Targets & incentives",
              children:
                user && hasPermission("targets.view") ? (
                  <>
                    <SectionCard
                      icon="◷"
                      title="Sales target"
                      subtitle="Leave blank if the person carries no quota"
                      color={appTokens.primary}
                      background={appTokens.primarySoft}
                      extra={
                        <Text type="secondary" style={{ fontSize: 11 }}>
                          optional
                        </Text>
                      }
                    >
                      <TargetsSection userId={user.id} />
                    </SectionCard>

                    <SectionCard
                      icon="★"
                      title="Incentives"
                      subtitle="Slabs on attainment"
                      color={appTokens.warning}
                      background="#fff8ec"
                      extra={
                        <Text type="secondary" style={{ fontSize: 11 }}>
                          optional
                        </Text>
                      }
                    >
                      <IncentivePlanSection userId={user.id} />
                    </SectionCard>

                    <SectionCard
                      icon="₹"
                      title="Commissions"
                      subtitle="Recurring share on collections"
                      color={appTokens.success}
                      background="#f1faf1"
                      extra={
                        <Text type="secondary" style={{ fontSize: 11 }}>
                          optional
                        </Text>
                      }
                    >
                      <UserCommissionSection userId={user.id} />
                    </SectionCard>
                  </>
                ) : (
                  <Text type="secondary">Save this person first, then come back here to set a target and assign an incentive plan.</Text>
                ),
            },
          ]}
        />
      </Form>
    </Drawer>
  );
}
