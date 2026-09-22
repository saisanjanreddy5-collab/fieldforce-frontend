import { useEffect, useState } from "react";
import { Button, DatePicker, Form, Input, InputNumber, Popconfirm, Progress, Radio, Space, Table, Typography, message } from "antd";
import { isAxiosError } from "axios";
import dayjs, { type Dayjs } from "dayjs";
import * as targetApi from "../api/target-api";
import type { PeriodType, Target } from "../types/target";
import { formatCompactCurrency } from "../utils/lead-format";
import { useHasPermission } from "../hooks/use-permission";

const { Text } = Typography;

// Cycle only offers what target-service.ts's computePeriodBoundaries
// actually knows how to compute (monthly/quarterly/annual) - a
// "Half-yearly" option would need new period-boundary math this session
// deliberately didn't add, since the instruction was not to invent another
// target calculation.
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
  unitTarget?: string;
}

interface TargetsSectionProps {
  userId: string;
}

// Lives inside the Create/Edit user drawer's "Sales target" section - a
// person's targets are managed here rather than a separate screen. Keeps
// the full history (a person's targets change period to period) rather
// than collapsing to a single current value, since the real backend
// already supports and depends on that.
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
      unitTarget: target.unitTarget ?? undefined,
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
        unitTarget: values.unitTarget,
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

  const canManage = editingTargetId ? hasPermission("targets.update") : hasPermission("targets.create");

  return (
    <div>
      {canManage && (
        <Form<FormValues> form={form} layout="vertical" onFinish={handleSubmit} initialValues={{ periodType: "monthly" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
            <Form.Item name="targetAmount" label="Target amount" rules={[{ required: true, message: "Enter an amount" }]}>
              <InputNumber placeholder="e.g. 4200000" prefix="₹" min={0} style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item name="unitTarget" label="Unit target" tooltip="Optional - a non-currency goal alongside the amount">
              <Input placeholder="e.g. 12 franchises" />
            </Form.Item>
          </div>
          <Form.Item name="periodType" label="Cycle" rules={[{ required: true }]}>
            <Radio.Group
              options={PERIOD_OPTIONS}
              optionType="button"
              buttonStyle="solid"
              onChange={() => form.setFieldValue("periodAnchor", undefined)}
            />
          </Form.Item>
          <Form.Item name="periodAnchor" label="Effective from" rules={[{ required: true, message: "Pick a period" }]}>
            <DatePicker picker={PICKER_BY_TYPE[periodType]} placeholder="Select period" style={{ width: "100%", maxWidth: 260 }} />
          </Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" loading={saving}>
              {editingTargetId ? "Save target" : "Add target"}
            </Button>
            {editingTargetId && <Button onClick={startCreate}>Cancel</Button>}
          </Space>
        </Form>
      )}

      {targets.length > 0 && (
        <>
          <Text strong style={{ display: "block", marginTop: 16, marginBottom: 4 }}>
            History
          </Text>
          <Table<Target>
            size="small"
            rowKey="id"
            loading={loading}
            dataSource={targets}
            pagination={false}
            locale={{ emptyText: "No targets yet" }}
            columns={[
              {
                title: "Period",
                key: "period",
                render: (_, t) => `${PERIOD_LABEL[t.periodType]} - ${t.periodStart} to ${t.periodEnd}`,
              },
              { title: "Target", dataIndex: "targetAmount", render: (v: number) => formatCompactCurrency(v) },
              { title: "Unit target", dataIndex: "unitTarget", render: (v: string | null) => v ?? "-" },
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
        </>
      )}
    </div>
  );
}
