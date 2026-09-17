import { useEffect, useState } from "react";
import { App, Form, Input, InputNumber, Modal, Select } from "antd";
import * as leadApi from "../../api/lead-api";
import * as opportunityApi from "../../api/opportunity-api";
import type { Lead } from "../../types/lead";
import type { Opportunity } from "../../types/opportunity";

interface NewOpportunityModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (opportunity: Opportunity) => void;
  /** Pre-select a lead (e.g. clicking "+ Add" under a specific stage column). */
  defaultLeadId?: string;
  /** Which column's "+ Add" was clicked - creates the opportunity directly in that stage. */
  defaultStage?: string;
}

interface FormValues {
  leadId: string;
  name?: string;
  value?: number;
  closeDate?: string;
}

export function NewOpportunityModal({ open, onClose, onCreated, defaultLeadId, defaultStage }: NewOpportunityModalProps) {
  const { message } = App.useApp();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm<FormValues>();

  useEffect(() => {
    if (!open) return;
    leadApi
      .listLeads({ limit: 100 })
      .then(setLeads)
      .catch(() => message.error("Failed to load leads"));
    form.setFieldsValue({ leadId: defaultLeadId });
  }, [open, defaultLeadId, form, message]);

  const handleSubmit = async (values: FormValues) => {
    setSubmitting(true);
    try {
      const opportunity = await opportunityApi.convertLead(values.leadId, {
        name: values.name,
        value: values.value,
        closeDate: values.closeDate,
        stage: defaultStage,
      });
      message.success("Opportunity created");
      form.resetFields();
      onCreated(opportunity);
    } catch {
      message.error("Failed to create opportunity - the lead may already need to be verified/eligible first");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title="New opportunity"
      open={open}
      onCancel={onClose}
      onOk={() => form.submit()}
      confirmLoading={submitting}
      okText="Create opportunity"
      destroyOnHidden
    >
      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Form.Item name="leadId" label="Lead" rules={[{ required: true, message: "Select the lead this deal belongs to" }]}>
          <Select
            showSearch
            placeholder="Search by name, company, or city"
            optionFilterProp="label"
            options={leads.map((l) => ({
              value: l.id,
              label: `${l.fullName}${l.companyName ? ` — ${l.companyName}` : ""}${l.storeCity ? ` (${l.storeCity})` : ""}`,
            }))}
          />
        </Form.Item>
        <Form.Item name="name" label="Opportunity name">
          <Input placeholder="e.g. FOFO store — Karve Road (leave blank to use the lead's name)" />
        </Form.Item>
        <Form.Item name="value" label="Deal value">
          <InputNumber style={{ width: "100%" }} prefix="₹" min={0} />
        </Form.Item>
        <Form.Item name="closeDate" label="Expected close date">
          <Input type="date" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
