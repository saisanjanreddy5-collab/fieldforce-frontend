import { useEffect, useState } from "react";
import { App, Button, Drawer, Form, Input, InputNumber, Select, Space } from "antd";
import * as opportunityApi from "../../api/opportunity-api";
import type { Opportunity } from "../../types/opportunity";
import { STAGE_OPTIONS } from "./stages";

interface EditOpportunityDrawerProps {
  opportunity: Opportunity | null;
  onClose: () => void;
  onUpdated: (opportunity: Opportunity) => void;
}

interface FormValues {
  name?: string;
  value?: number;
  stage: string;
  closeDate?: string;
  probability?: number;
  notes?: string;
}

export function EditOpportunityDrawer({ opportunity, onClose, onUpdated }: EditOpportunityDrawerProps) {
  const { message } = App.useApp();
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm<FormValues>();

  useEffect(() => {
    if (!opportunity) return;
    form.setFieldsValue({
      name: opportunity.name ?? undefined,
      value: opportunity.value ?? undefined,
      stage: opportunity.stage,
      closeDate: opportunity.closeDate ?? undefined,
      probability: opportunity.probability ?? undefined,
      notes: opportunity.notes ?? undefined,
    });
  }, [opportunity, form]);

  const handleSubmit = async (values: FormValues) => {
    if (!opportunity) return;
    setSaving(true);
    try {
      const updated = await opportunityApi.updateOpportunity(opportunity.id, values);
      message.success("Opportunity updated");
      onUpdated(updated);
    } catch {
      message.error("Failed to update opportunity");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer
      title={opportunity?.name ?? opportunity?.leadFullName ?? "Opportunity"}
      open={!!opportunity}
      onClose={onClose}
      extra={
        <Space>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="primary" loading={saving} onClick={() => form.submit()}>
            Save
          </Button>
        </Space>
      }
    >
      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Form.Item name="name" label="Opportunity name">
          <Input placeholder={opportunity?.leadFullName} />
        </Form.Item>
        <Form.Item name="stage" label="Stage" rules={[{ required: true }]}>
          <Select options={STAGE_OPTIONS} />
        </Form.Item>
        <Form.Item name="value" label="Deal value">
          <InputNumber style={{ width: "100%" }} prefix="₹" min={0} />
        </Form.Item>
        <Form.Item name="probability" label="Probability (%)">
          <InputNumber style={{ width: "100%" }} min={0} max={100} />
        </Form.Item>
        <Form.Item name="closeDate" label="Expected close date">
          <Input type="date" />
        </Form.Item>
        <Form.Item name="notes" label="Notes">
          <Input.TextArea rows={4} />
        </Form.Item>
      </Form>
    </Drawer>
  );
}
