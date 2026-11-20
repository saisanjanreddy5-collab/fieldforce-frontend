import { useEffect, useRef, useState } from "react";
import { App, Form, Input, InputNumber, Modal, Select } from "antd";
import * as leadApi from "../../api/lead-api";
import * as opportunityApi from "../../api/opportunity-api";
import type { Lead } from "../../types/lead";
import type { Opportunity } from "../../types/opportunity";
import { errorMessageFrom } from "../../utils/api-error";

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
  const [searching, setSearching] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchToken = useRef(0);
  const selectedLeadRef = useRef<Lead | null>(null);

  // Exactly the leads the server will accept (owned by a Field Sales
  // Executive - whatever stage they're at - and not closed-lost; see
  // convertLeadToOpportunity), searched on the server as you type so every
  // such lead is findable, not just the first page.
  const loadLeads = (search?: string) => {
    const token = ++searchToken.current;
    setSearching(true);
    leadApi
      .listLeads({ opportunityReady: true, limit: 50, ...(search ? { search } : {}) })
      .then((result) => {
        if (token !== searchToken.current) return;
        const selected = selectedLeadRef.current;
        setLeads(selected && !result.leads.some((l) => l.id === selected.id) ? [selected, ...result.leads] : result.leads);
      })
      .catch(() => message.error("Failed to load leads"))
      .finally(() => {
        if (token === searchToken.current) setSearching(false);
      });
  };

  const handleSearch = (value: string) => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => loadLeads(value.trim() || undefined), 300);
  };
  const [form] = Form.useForm<FormValues>();

  useEffect(() => {
    if (!open) return;
    // Converting a lead to an opportunity only succeeds once it's reached
    // Qualified AND been handed to Field Sales (owner's role is "agent") -
    // see convertLeadToOpportunity's own rejections. Filtering to exactly
    // that here means every lead in this dropdown is guaranteed to convert;
    // picking from an unfiltered list (every stage mixed together, sorted by
    // recency) was why this looked like a random, intermittent failure.
    selectedLeadRef.current = null;
    loadLeads();
    if (defaultLeadId) {
      leadApi
        .getLead(defaultLeadId)
        .then((lead) => {
          selectedLeadRef.current = lead;
          setLeads((prev) => (prev.some((l) => l.id === lead.id) ? prev : [lead, ...prev]));
        })
        .catch(() => undefined);
    }
    form.setFieldsValue({ leadId: defaultLeadId });
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    } catch (error) {
      message.error(errorMessageFrom(error, "Failed to create opportunity - something went wrong, please try again"));
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
            showSearch={{ filterOption: false, onSearch: handleSearch }}
            placeholder="Search by name, company, or phone"
            loading={searching}
            onChange={(id: string) => {
              selectedLeadRef.current = leads.find((l) => l.id === id) ?? null;
            }}
            notFoundContent={
              searching
                ? "Searching..."
                : "No matching lead with Field Sales - an opportunity can only be created once a lead has been sent to a Field Sales Executive"
            }
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
        <Form.Item
          name="closeDate"
          label="Expected close date"
          rules={[
            {
              validator: (_, value: string | undefined) =>
                !value || value >= new Date().toISOString().slice(0, 10)
                  ? Promise.resolve()
                  : Promise.reject(new Error("Expected close date can't be in the past")),
            },
          ]}
        >
          <Input type="date" min={new Date().toISOString().slice(0, 10)} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
