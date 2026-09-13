import { useEffect, useState } from "react";
import { Button, Drawer, Form, Input, Select, Space, Table, Tag, Typography, message } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { isAxiosError } from "axios";
import * as userApi from "../api/user-api";
import type { CreateUserPayload, TeamMember } from "../types/user";

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

interface FormValues {
  name: string;
  email: string;
  password: string;
  role: "admin" | "manager" | "agent";
  designation?: string;
  managerId?: string;
}

export default function SalesForceManagementPage() {
  const [users, setUsers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm<FormValues>();

  const load = () => {
    setLoading(true);
    userApi
      .listUsers()
      .then(setUsers)
      .catch(() => message.error("Failed to load team members"))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleSubmit = async (values: FormValues) => {
    setSaving(true);
    try {
      const payload: CreateUserPayload = {
        name: values.name,
        email: values.email,
        password: values.password,
        role: values.role,
        designation: values.designation,
        managerId: values.managerId,
      };
      await userApi.createUser(payload);
      message.success("Account created");
      form.resetFields();
      setDrawerOpen(false);
      load();
    } catch (err) {
      const description =
        isAxiosError<{ message?: string }>(err) && err.response?.data.message
          ? err.response.data.message
          : "Failed to create account";
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
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setDrawerOpen(true)}>
          Add user
        </Button>
      </div>

      <Table
        rowKey="id"
        loading={loading}
        dataSource={users}
        pagination={false}
        columns={[
          { title: "Name", dataIndex: "name" },
          { title: "Email", dataIndex: "email" },
          {
            title: "Role",
            dataIndex: "role",
            render: (role: string) => <Tag color={ROLE_COLORS[role]}>{role}</Tag>,
          },
          { title: "Designation", dataIndex: "designation", render: (v: string | null) => v ?? "-" },
          {
            title: "Reports to",
            dataIndex: "managerId",
            render: (managerId: string | null) => users.find((u) => u.id === managerId)?.name ?? "-",
          },
        ]}
      />

      <Drawer
        title="Add user"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        size="default"
        extra={
          <Space>
            <Button onClick={() => setDrawerOpen(false)}>Cancel</Button>
            <Button type="primary" loading={saving} onClick={() => form.submit()}>
              Create account
            </Button>
          </Space>
        }
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
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
          <Form.Item name="designation" label="Designation">
            <Input placeholder="e.g. Regional Sales Manager" />
          </Form.Item>
          <Form.Item name="managerId" label="Reports to">
            <Select
              allowClear
              placeholder="Select a manager"
              options={users.map((u) => ({ value: u.id, label: u.name }))}
            />
          </Form.Item>
        </Form>
      </Drawer>
    </div>
  );
}
