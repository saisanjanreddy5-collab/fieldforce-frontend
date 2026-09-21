import { useEffect, useState } from "react";
import { Button, DatePicker, Form, Popconfirm, Select, Space, Table, Tag, Typography, message } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { isAxiosError } from "axios";
import dayjs, { type Dayjs } from "dayjs";
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
}

interface IncentivePlanSectionProps {
  userId: string;
}

// Assigns from the shared incentive_plans catalog (Territory & targets tab
// owns that catalog) rather than letting each person have arbitrary custom
// terms - a plan's own commission_rules are shown read-only here as
// reference, since FieldForce has no per-user commission-terms model.
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

  return (
    <div style={{ marginBottom: 16 }}>
      <Text strong>Incentive plans</Text>
      <Table<UserIncentivePlan>
        size="small"
        rowKey="id"
        loading={loading}
        dataSource={assignments}
        pagination={false}
        style={{ marginTop: 8, marginBottom: 12 }}
        locale={{ emptyText: "No incentive plan assigned yet" }}
        columns={[
          { title: "Plan", key: "plan", render: (_, a) => planName(a.incentivePlanId) },
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
              hasPermission("incentive_plans.view") && (
                <Popconfirm title="Remove this incentive plan assignment?" onConfirm={() => handleDelete(a.id)}>
                  <Button type="link" size="small" danger>
                    Remove
                  </Button>
                </Popconfirm>
              ),
          },
        ]}
      />
      <Form<FormValues> form={form} layout="inline" onFinish={handleSubmit}>
        <Form.Item name="incentivePlanId" rules={[{ required: true, message: "Pick a plan" }]}>
          <Select
            style={{ width: 220 }}
            placeholder="Select incentive plan"
            options={plans.filter((p) => p.isActive).map((p) => ({ value: p.id, label: p.name }))}
          />
        </Form.Item>
        <Form.Item name="effectiveStartDate" rules={[{ required: true, message: "Pick a start date" }]}>
          <DatePicker placeholder="Effective from" />
        </Form.Item>
        <Form.Item name="effectiveEndDate">
          <DatePicker placeholder="Effective to (optional)" disabledDate={(d) => d.isBefore(dayjs(), "day")} />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit" icon={<PlusOutlined />} loading={saving}>
            Assign
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
}
