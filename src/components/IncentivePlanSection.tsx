import { useEffect, useState } from "react";
import { Button, DatePicker, Form, Input, InputNumber, Popconfirm, Select, Space, Table, Tag, Typography, message } from "antd";
import { isAxiosError } from "axios";
import type { Dayjs } from "dayjs";
import * as incentivePlanApi from "../api/incentive-plan-api";
import * as userIncentivePlanApi from "../api/user-incentive-plan-api";
import * as commissionRuleApi from "../api/commission-rule-api";
import type { IncentivePlan } from "../types/incentive-plan";
import type { UserIncentivePlan } from "../types/user-incentive-plan";
import type { CommissionRule } from "../types/commission-rule";
import { useHasPermission } from "../hooks/use-permission";

const { Text } = Typography;

interface FormValues {
  incentivePlanId: string;
  effectiveStartDate: Dayjs;
  effectiveEndDate?: Dayjs;
  rate?: string;
  capPerCycle?: number;
  paysFromAttainmentPercent?: number;
}

interface IncentivePlanSectionProps {
  userId: string;
}

// Assigns from the shared incentive_plans catalog (Territory & targets tab
// owns that catalog) - rate/cap/pays-from are configuration only, same
// honesty convention as everywhere else marked this way: FieldForce has no
// payout engine, so nothing computes an actual incentive amount from them.
export function IncentivePlanSection({ userId }: IncentivePlanSectionProps) {
  const hasPermission = useHasPermission();
  const [plans, setPlans] = useState<IncentivePlan[]>([]);
  const [assignments, setAssignments] = useState<UserIncentivePlan[]>([]);
  const [rulesByPlan, setRulesByPlan] = useState<Record<string, CommissionRule[]>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm<FormValues>();

  const load = () => {
    setLoading(true);
    Promise.all([incentivePlanApi.listIncentivePlans(), userIncentivePlanApi.listUserIncentivePlans(userId)])
      .then(([allPlans, userAssignments]) => {
        setPlans(allPlans);
        setAssignments(userAssignments);
      })
      .catch(() => message.error("Failed to load incentive plans"))
      .finally(() => setLoading(false));
  };

  useEffect(load, [userId]);

  useEffect(() => {
    assignments.forEach((a) => {
      if (rulesByPlan[a.incentivePlanId]) return;
      commissionRuleApi
        .listCommissionRules(a.incentivePlanId)
        .then((rules) => setRulesByPlan((prev) => ({ ...prev, [a.incentivePlanId]: rules })))
        .catch(() => undefined);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignments]);

  const planName = (id: string) => plans.find((p) => p.id === id)?.name ?? "Unknown plan";

  const handleDelete = async (id: string) => {
    try {
      await userIncentivePlanApi.deleteUserIncentivePlan(id);
      message.success("Incentive plan removed");
      load();
    } catch {
      message.error("Failed to remove incentive plan");
    }
  };

  const handleSubmit = async (values: FormValues) => {
    setSaving(true);
    try {
      await userIncentivePlanApi.createUserIncentivePlan({
        userId,
        incentivePlanId: values.incentivePlanId,
        effectiveStartDate: values.effectiveStartDate.format("YYYY-MM-DD"),
        effectiveEndDate: values.effectiveEndDate?.format("YYYY-MM-DD"),
        rate: values.rate,
        capPerCycle: values.capPerCycle,
        paysFromAttainmentPercent: values.paysFromAttainmentPercent,
      });
      message.success("Incentive plan assigned");
      form.resetFields();
      load();
    } catch (err) {
      const description =
        isAxiosError<{ message?: string }>(err) && err.response?.data.message
          ? err.response.data.message
          : "Failed to assign incentive plan";
      message.error(description);
    } finally {
      setSaving(false);
    }
  };

  const canManage = hasPermission("incentive_plans.view");

  return (
    <div>
      {canManage && (
        <Form<FormValues> form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="incentivePlanId" label="Incentive plan" rules={[{ required: true, message: "Pick a plan" }]}>
            <Select
              placeholder="Select an incentive plan"
              options={plans.filter((p) => p.isActive).map((p) => ({ value: p.id, label: p.name }))}
              notFoundContent={<Text type="secondary">No incentive plans configured yet - add one in Territory &amp; targets</Text>}
            />
          </Form.Item>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
            <Form.Item name="rate" label="Rate" tooltip="Free text, e.g. '2.5% of net value' - configuration only, not computed">
              <Input placeholder="e.g. 2.5% of net value" />
            </Form.Item>
            <Form.Item name="capPerCycle" label="Cap per cycle">
              <InputNumber placeholder="e.g. 75000" prefix="₹" min={0} style={{ width: "100%" }} />
            </Form.Item>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
            <Form.Item name="paysFromAttainmentPercent" label="Pays from (attainment %)">
              <InputNumber placeholder="e.g. 80" min={0} max={1000} suffix="%" style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item name="effectiveStartDate" label="Effective from" rules={[{ required: true, message: "Pick a start date" }]}>
              <DatePicker style={{ width: "100%" }} />
            </Form.Item>
          </div>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={saving}>
              Assign incentive plan
            </Button>
          </Form.Item>
        </Form>
      )}

      {assignments.length > 0 && (
        <>
          <Text strong style={{ display: "block", marginBottom: 4 }}>
            Assigned plans
          </Text>
          <Table<UserIncentivePlan>
            size="small"
            rowKey="id"
            loading={loading}
            dataSource={assignments}
            pagination={false}
            columns={[
              { title: "Plan", key: "plan", render: (_, a) => planName(a.incentivePlanId) },
              { title: "Rate", dataIndex: "rate", render: (v: string | null) => v ?? "-" },
              { title: "Cap/cycle", dataIndex: "capPerCycle", render: (v: number | null) => (v === null ? "-" : `₹${v}`) },
              { title: "Pays from", dataIndex: "paysFromAttainmentPercent", render: (v: number | null) => (v === null ? "-" : `${v}%`) },
              {
                title: "Effective",
                key: "effective",
                render: (_, a) => `${a.effectiveStartDate}${a.effectiveEndDate ? ` to ${a.effectiveEndDate}` : " onward"}`,
              },
              {
                title: "Commission rules",
                key: "rules",
                render: (_, a) => {
                  const rules = rulesByPlan[a.incentivePlanId] ?? [];
                  return rules.length === 0 ? (
                    <Text type="secondary">None</Text>
                  ) : (
                    <Space size={4} wrap>
                      {rules.map((r) => (
                        <Tag key={r.id}>{r.name}</Tag>
                      ))}
                    </Space>
                  );
                },
              },
              {
                title: "",
                key: "actions",
                render: (_, a) =>
                  canManage && (
                    <Popconfirm title="Remove this incentive plan assignment?" onConfirm={() => handleDelete(a.id)}>
                      <Button type="link" size="small" danger>
                        Remove
                      </Button>
                    </Popconfirm>
                  ),
              },
            ]}
          />
        </>
      )}
    </div>
  );
}
