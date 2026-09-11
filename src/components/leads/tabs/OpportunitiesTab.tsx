import { useEffect, useState } from "react";
import { Button, Empty, Form, Input, InputNumber, Modal, Spin, Tag, Typography, message } from "antd";
import * as opportunityApi from "../../../api/opportunity-api";
import type { Opportunity } from "../../../types/opportunity";
import { formatCompactCurrency, formatDate } from "../../../utils/lead-format";

const { Text, Title } = Typography;

interface OpportunitiesTabProps {
  leadId: string;
}

interface NewOpportunityFormValues {
  name?: string;
  value?: number;
  closeDate?: string;
}

export function OpportunitiesTab({ leadId }: OpportunitiesTabProps) {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm<NewOpportunityFormValues>();

  const load = () => {
    setLoading(true);
    opportunityApi
      .listOpportunitiesForLead(leadId)
      .then(setOpportunities)
      .catch(() => message.error("Failed to load opportunities"))
      .finally(() => setLoading(false));
  };

  useEffect(load, [leadId]);

  const handleCreate = async (values: NewOpportunityFormValues) => {
    setSubmitting(true);
    try {
      await opportunityApi.convertLead(leadId, { name: values.name, value: values.value, closeDate: values.closeDate });
      message.success("Opportunity created");
      setModalOpen(false);
      form.resetFields();
      load();
    } catch {
      message.error("Failed to create opportunity");
    } finally {
      setSubmitting(false);
    }
  };

  const totalValue = opportunities.reduce((sum, o) => sum + (o.value ?? 0), 0);
  const openCount = opportunities.filter((o) => o.stage !== "won" && o.stage !== "lost").length;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
        <div>
          <Title level={5} style={{ margin: 0 }}>
            Opportunities from this lead
          </Title>
          <Text type="secondary">
            {openCount} open · {formatCompactCurrency(totalValue)} combined pipeline
          </Text>
        </div>
        <Button type="primary" onClick={() => setModalOpen(true)}>
          + New opportunity
        </Button>
      </div>

      {loading ? (
        <Spin />
      ) : opportunities.length === 0 ? (
        <Empty description="No opportunities yet" />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {opportunities.map((opp) => (
            <div
              key={opp.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "10px 12px",
                border: "1px solid #f0f0f0",
                borderRadius: 8,
                flexWrap: "wrap",
                gap: 8,
              }}
            >
              <div>
                <Text strong>{opp.name ?? "Untitled opportunity"}</Text>
                <div>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Close {formatDate(opp.closeDate)}
                  </Text>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Text strong>{formatCompactCurrency(opp.value)}</Text>
                <Tag>{opp.stage}</Tag>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        title="New opportunity"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        okButtonProps={{ loading: submitting }}
      >
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Form.Item name="name" label="Opportunity name">
            <Input placeholder="e.g. FOFO store — Karve Road" />
          </Form.Item>
          <Form.Item name="value" label="Value">
            <InputNumber style={{ width: "100%" }} prefix="₹" min={0} />
          </Form.Item>
          <Form.Item name="closeDate" label="Expected close date">
            <Input type="date" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
