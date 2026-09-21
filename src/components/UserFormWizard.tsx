import { useEffect, useState } from "react";
import { Button, Drawer, Form, Input, Select, Space, Tabs, Tag, Typography, message } from "antd";
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
import { TargetsSection } from "./TargetsSection";
import { IncentivePlanSection } from "./IncentivePlanSection";

const { Text } = Typography;

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
        border: "1px solid #f0f0f0",
        borderRadius: 6,
        marginBottom: 4,
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
    <div style={{ marginBottom: 12 }}>
      {skipLevel && row("skip level", skipLevel.name, skipLevel.designation ?? levelName(skipLevel.levelId))}
      {row("manager", manager.name, manager.designation ?? levelName(manager.levelId), "blue")}
      {row("this user", name?.trim() || "New user", designation, "green")}
      <Text type="secondary" style={{ fontSize: 11 }}>
        Ownership follows this line: {manager.name} and everyone above will see this person&apos;s records.
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

  const zoneId = Form.useWatch("zoneId", form);
  const managerId = Form.useWatch("managerId", form);
  const levelId = Form.useWatch("levelId", form);
  const nameWatch = Form.useWatch("name", form);
  const designationWatch = Form.useWatch("designation", form);

  useEffect(() => {
    if (!open) return;
    classificationApi.listDivisionChannels().then(setDivisionChannels).catch(() => undefined);
    classificationApi.listCustomerCategories().then(setCustomerCategories).catch(() => undefined);
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
      title={user ? `Edit ${user.name}` : "Create user"}
      open={open}
      onClose={onClose}
      size="default"
      extra={
        <Space>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="primary" loading={saving} onClick={() => form.submit()}>
            {user ? "Save changes" : "Create user"}
          </Button>
        </Space>
      }
    >
      <Text type="secondary" style={{ display: "block", marginBottom: 16 }}>
        Identity, position, geography, targets and incentives
      </Text>
      <Form<FormValues> form={form} layout="vertical" onFinish={handleSubmit} initialValues={{ status: "active" }}>
        <Tabs
          items={[
            {
              key: "identity",
              label: "Identity",
              children: (
                <>
                  {user ? (
                    <Text type="secondary" style={{ display: "block", marginBottom: 16 }}>
                      {user.email} · {user.role}
                    </Text>
                  ) : (
                    <>
                      <Form.Item name="name" label="Full name" rules={[{ required: true, message: "Name is required" }]}>
                        <Input placeholder="e.g. Neha Sharma" />
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
                    </>
                  )}
                  <Form.Item name="employeeCode" label="Employee code" rules={[{ required: true, message: "Employee code is required" }]}>
                    <Input placeholder="e.g. EMP-0041" />
                  </Form.Item>
                  <Form.Item name="mobile" label="Mobile" rules={[{ required: true, message: "Mobile is required" }]}>
                    <Input placeholder="e.g. +91 98xxx xxxxx" />
                  </Form.Item>
                  <Form.Item name="dateOfJoining" label="Date of joining">
                    <Input type="date" />
                  </Form.Item>
                  <Form.Item name="status" label="Status">
                    <Select options={STATUS_OPTIONS} />
                  </Form.Item>
                </>
              ),
            },
            {
              key: "position",
              label: "Position & geography",
              children: (
                <>
                  <Text strong style={{ display: "block", marginBottom: 4 }}>
                    Where they sit
                  </Text>
                  <OrgChartPreview managerId={managerId} users={users} levels={levels} name={nameWatch} designation={designationWatch} />

                  <Form.Item name="designation" label="Designation">
                    <Input placeholder="e.g. Regional Sales Manager" />
                  </Form.Item>
                  <Form.Item
                    name="levelId"
                    label="Level"
                    tooltip="Drives the org chart and data ownership - also determines their real backend access tier"
                    rules={[{ required: true, message: "Level is required" }]}
                  >
                    <Select placeholder="Select a level" options={levels.map((l) => ({ value: l.id, label: l.name }))} />
                  </Form.Item>
                  <Form.Item name="managerId" label="Reports to">
                    <Select
                      allowClear
                      showSearch
                      optionFilterProp="label"
                      placeholder="Select a manager"
                      options={managerCandidates.map((u) => ({ value: u.id, label: u.name }))}
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

                  <Text strong style={{ display: "block", marginTop: 16, marginBottom: 4 }}>
                    Geography &amp; office
                  </Text>
                  <Form.Item name="zoneId" label="Region">
                    <Select
                      allowClear
                      placeholder="Select a region"
                      options={zones.map((z) => ({ value: z.id, label: z.name }))}
                    />
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
                  <Form.Item
                    name="territory"
                    label="Territory"
                    tooltip="A new lead is auto-assigned to whoever has this exact territory - must be unique per person"
                  >
                    <Input placeholder="e.g. Karnataka · Mysuru" />
                  </Form.Item>
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
                  <Form.Item
                    name="smartfloAgentNumber"
                    label="Smartflo agent number"
                    tooltip="Their own registered Smartflo agent number/mobile - required for the Call button to work"
                  >
                    <Input placeholder="e.g. 9876543210" />
                  </Form.Item>
                </>
              ),
            },
            {
              key: "targets",
              label: "Targets & incentives",
              children:
                user && hasPermission("targets.view") ? (
                  <>
                    <TargetsSection userId={user.id} />
                    <IncentivePlanSection userId={user.id} />
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
