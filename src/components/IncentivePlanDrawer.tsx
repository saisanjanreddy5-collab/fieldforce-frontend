import { useEffect } from "react";
import { Button, Checkbox, Drawer, Form, Input, Space, Typography, message } from "antd";
import { isAxiosError } from "axios";
import * as incentivePlanApi from "../api/incentive-plan-api";
import type { IncentivePlan } from "../types/incentive-plan";
import { useHasPermission } from "../hooks/use-permission";
import { CommissionRulesSection } from "./CommissionRulesSection";

const { Text } = Typography;

interface FormValues {
  name: string;
  description?: string;
  effectiveStartDate: string;
  effectiveEndDate?: string;
  isActive: boolean;
}

interface IncentivePlanDrawerProps {
  open: boolean;
  plan: IncentivePlan | null;
  onClose: () => void;
  onSaved: () => void;
}

export function IncentivePlanDrawer({ open, plan, onClose, onSaved }: IncentivePlanDrawerProps) {
  const hasPermission = useHasPermission();
  const [form] = Form.useForm<FormValues>();

  useEffect(() => {
    if (!open) return;
    if (plan) {
      form.setFieldsValue({
        name: plan.name,
        description: plan.description ?? undefined,
        effectiveStartDate: plan.effectiveStartDate,
        effectiveEndDate: plan.effectiveEndDate ?? undefined,
        isActive: plan.isActive,
      });
    } else {
      form.resetFields();
    }
  }, [open, plan, form]);

  const handleSubmit = async (values: FormValues) => {
    try {
      if (plan) {
        await incentivePlanApi.updateIncentivePlan(plan.id, values);
        message.success("Incentive plan updated");
      } else {
        await incentivePlanApi.createIncentivePlan(values);
        message.success("Incentive plan created");
      }
      onSaved();
    } catch (err) {
      const description =
        isAxiosError<{ message?: string }>(err) && err.response?.data.message
          ? err.response.data.message
          : "Failed to save incentive plan";
      message.error(description);
    }
  };

  return (
    <Drawer
      title={plan ? `Edit ${plan.name}` : "New incentive plan"}
      open={open}
      onClose={onClose}
      size="default"
      extra={
        <Space>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="primary" onClick={() => form.submit()}>
            {plan ? "Save changes" : "Create plan"}
          </Button>
        </Space>
      }
    >
      <Text type="secondary" style={{ display: "block", marginBottom: 16 }}>
        Configuration only - no commission or payout is calculated from a plan or its rules yet.
      </Text>
      <Form<FormValues> form={form} layout="vertical" onFinish={handleSubmit} initialValues={{ isActive: true }}>
        <Form.Item name="name" label="Plan name" rules={[{ required: true, message: "Name is required" }]}>
          <Input placeholder="e.g. FY26 Franchise Incentive" />
        </Form.Item>
        <Form.Item name="description" label="Description">
          <Input.TextArea placeholder="What this plan is for" rows={2} />
        </Form.Item>
        <Form.Item
          name="effectiveStartDate"
          label="Effective from"
          rules={[{ required: true, message: "Effective start date is required" }]}
        >
          <Input type="date" />
        </Form.Item>
        <Form.Item name="effectiveEndDate" label="Effective until (optional)">
          <Input type="date" />
        </Form.Item>
        <Form.Item name="isActive" valuePropName="checked">
          <Checkbox>Active</Checkbox>
        </Form.Item>
      </Form>

      {plan && hasPermission("commission_rules.view") && <CommissionRulesSection incentivePlanId={plan.id} />}
    </Drawer>
  );
}
