import { useEffect, useState } from "react";
import { Button, DatePicker, Form, InputNumber, Popconfirm, Progress, Select, Space, Table, Typography, message } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { isAxiosError } from "axios";
import dayjs, { type Dayjs } from "dayjs";
import * as targetApi from "../api/target-api";
import type { PeriodType, Target } from "../types/target";
import { formatCompactCurrency } from "../utils/lead-format";
import { useHasPermission } from "../hooks/use-permission";

const { Text } = Typography;

const PERIOD_OPTIONS: { value: PeriodType; label: string }[] = [
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "annual", label: "Annual" },
];

const PERIOD_LABEL: Record<PeriodType, string> = {
  monthly: "Monthly",
  quarterly: "Quarterly",
  annual: "Annual",
};

const PICKER_BY_TYPE: Record<PeriodType, "month" | "quarter" | "year"> = {
  monthly: "month",
  quarterly: "quarter",
  annual: "year",
};

interface FormValues {
  periodType: PeriodType;
  periodAnchor: Dayjs;
  targetAmount: number;
}

interface TargetsSectionProps {
  userId: string;
}

// Lives inside the Edit User drawer - a person's targets are managed here
// rather than a separate screen, same "list + inline create" shape as the
// Sales teams/Offices/Levels cards elsewhere on this page, just scoped to
// one person and with Edit/Delete since a target is a real record, not a
// reference-data label.
export function TargetsSection({ userId }: TargetsSectionProps) {
  const hasPermission = useHasPermission();
  const [targets, setTargets] = useState<Target[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTargetId, setEditingTargetId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm<FormValues>();
  const periodType = Form.useWatch("periodType", form) ?? "monthly";

  const load = () => {
    setLoading(true);
    targetApi
      .listTargets(userId)
      .then(setTargets)
      .catch(() => message.error("Failed to load targets"))
      .finally(() => setLoading(false));
  };

  useEffect(load, [userId]);

  const startCreate = () => {
    setEditingTargetId(null);
    form.resetFields();
  };

  const startEdit = (target: Target) => {
    setEditingTargetId(target.id);
    form.setFieldsValue({
      periodType: target.periodType,
      periodAnchor: dayjs(target.periodStart),
      targetAmount: target.targetAmount,
    });
  };

  const handleDelete = async (id: string) => {
    try {
      await targetApi.deleteTarget(id);
      message.success("Target deleted");
      if (editingTargetId === id) startCreate();
      load();
    } catch {
      message.error("Failed to delete target");
    }
  };

  const handleSubmit = async (values: FormValues) => {
    setSaving(true);
    try {
      const payload = {
        periodType: values.periodType,
        periodAnchor: values.periodAnchor.format("YYYY-MM-DD"),
        targetAmount: values.targetAmount,
      };
      if (editingTargetId) {
        await targetApi.updateTarget(editingTargetId, payload);
        message.success("Target updated");
      } else {
        await targetApi.createTarget({ userId, ...payload });
        message.success("Target added");
      }
      form.resetFields();
      setEditingTargetId(null);
      load();
    } catch (err) {
      const description =
        isAxiosError<{ message?: string }>(err) && err.response?.data.message
          ? err.response.data.message
          : "Failed to save target";
      message.error(description);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ marginBottom: 16 }}>
      <Text strong>Targets</Text>
      <Table<Target>
        size="small"
        rowKey="id"
        loading={loading}
        dataSource={targets}
        pagination={false}
        style={{ marginTop: 8, marginBottom: 12 }}
        locale={{ emptyText: "No targets yet - add one below" }}
        columns={[
          {
            title: "Period",
            key: "period",
            render: (_, t) => `${PERIOD_LABEL[t.periodType]} · ${t.periodStart} to ${t.periodEnd}`,
          },
          { title: "Target", dataIndex: "targetAmount", render: (v: number) => formatCompactCurrency(v) },
          { title: "Achieved", dataIndex: "achievedAmount", render: (v: number) => formatCompactCurrency(v) },
          {
            title: "%",
            dataIndex: "achievementPercent",
            width: 140,
            render: (v: number) => <Progress percent={Math.min(v, 100)} size="small" format={() => `${v}%`} />,
          },
          {
            title: "",
            key: "actions",
            render: (_, t) => (
              <Space size={4}>
                {hasPermission("targets.update") && (
                  <Button type="link" size="small" onClick={() => startEdit(t)}>
                    Edit
                  </Button>
                )}
                {hasPermission("targets.delete") && (
                  <Popconfirm title="Delete this target?" onConfirm={() => handleDelete(t.id)}>
                    <Button type="link" size="small" danger>
                      Delete
                    </Button>
                  </Popconfirm>
                )}
              </Space>
            ),
          },
        ]}
      />
      {(editingTargetId ? hasPermission("targets.update") : hasPermission("targets.create")) && (
        <Form<FormValues> form={form} layout="inline" onFinish={handleSubmit} initialValues={{ periodType: "monthly" }}>
          <Form.Item name="periodType" rules={[{ required: true }]}>
            <Select
              style={{ width: 110 }}
              options={PERIOD_OPTIONS}
              onChange={() => form.setFieldValue("periodAnchor", undefined)}
            />
          </Form.Item>
          <Form.Item name="periodAnchor" rules={[{ required: true, message: "Pick a period" }]}>
            <DatePicker picker={PICKER_BY_TYPE[periodType]} placeholder="Select period" />
          </Form.Item>
          <Form.Item name="targetAmount" rules={[{ required: true, message: "Enter an amount" }]}>
            <InputNumber placeholder="Target amount" prefix="₹" min={0} style={{ width: 160 }} />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" icon={<PlusOutlined />} loading={saving}>
                {editingTargetId ? "Save" : "Add"}
              </Button>
              {editingTargetId && <Button onClick={startCreate}>Cancel</Button>}
            </Space>
          </Form.Item>
        </Form>
      )}
    </div>
  );
}
