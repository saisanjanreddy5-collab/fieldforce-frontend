import { useState } from "react";
import { Button, Empty, Form, Input, InputNumber, Modal, Spin, Tag, Tooltip, Typography, message } from "antd";
import { RiseOutlined } from "@ant-design/icons";
import * as opportunityApi from "../../../api/opportunity-api";
import type { Opportunity } from "../../../types/opportunity";
import { formatCompactCurrency, formatDate } from "../../../utils/lead-format";
import { useHasPermission } from "../../../hooks/use-permission";
import { FLC_STAGE, NEW_STAGE, SLC_STAGE } from "../../../utils/lead-constants";
import { appTokens } from "../../../utils/design-system";

const { Text, Title } = Typography;

const CALL_CENTER_TIER_STAGES: string[] = [NEW_STAGE, FLC_STAGE, SLC_STAGE];

interface OpportunitiesTabProps {
  leadId: string;
  /** Owned by LeadDetail (also needed there for the primary-action calc) -
   * passed down rather than fetched again here, to avoid a duplicate
   * request for the same data on every lead selection. */
  opportunities: Opportunity[];
  loading: boolean;
  onChanged: () => void;
  /** Drives the stage gate below - an opportunity can't exist for a lead
   * Call Center hasn't qualified yet (see opportunity-service.ts's own
   * backend check, the real enforcement; this is just the honest frontend
   * reflection of it). */
  leadStatus: string;
  /** The real "actually with Field Sales" signal (see opportunity-service.ts's
   * own comment) - sendToField never changes status, so a lead can read
   * "Qualified" while still sitting with Call Center, not yet pushed. Owner
   * role only becomes "agent" once a field employee actually owns it. */
  leadOwnerRole: string | null;
}

interface NewOpportunityFormValues {
  name?: string;
  value?: number;
  closeDate?: string;
}

export function OpportunitiesTab({ leadId, opportunities, loading, onChanged, leadStatus, leadOwnerRole }: OpportunitiesTabProps) {
  const hasPermission = useHasPermission();
  const notYetQualified = CALL_CENTER_TIER_STAGES.includes(leadStatus);
  const notYetSentToField = !notYetQualified && leadOwnerRole !== "agent";
  const createDisabled = notYetQualified || notYetSentToField;
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm<NewOpportunityFormValues>();

  const handleCreate = async (values: NewOpportunityFormValues) => {
    setSubmitting(true);
    try {
      await opportunityApi.convertLead(leadId, { name: values.name, value: values.value, closeDate: values.closeDate });
      message.success("Opportunity created");
      setModalOpen(false);
      form.resetFields();
      onChanged();
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
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 7,
              background: "#7248b8",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              fontSize: 14,
              marginTop: 1,
            }}
          >
            <RiseOutlined />
          </div>
          <div>
            <Title level={5} style={{ margin: 0 }}>
              Opportunities from this lead
            </Title>
            <Text type="secondary">
              {openCount} open · {formatCompactCurrency(totalValue)} combined pipeline
            </Text>
          </div>
        </div>
        {hasPermission("opportunities.create") && (
          <Tooltip
            title={
              notYetQualified
                ? "Available once this lead reaches Qualified"
                : notYetSentToField
                  ? "Available once this lead is sent to Field Sales"
                  : undefined
            }
          >
            <Button type="primary" disabled={createDisabled} onClick={() => setModalOpen(true)}>
              + New opportunity
            </Button>
          </Tooltip>
        )}
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
                border: `1px solid ${appTokens.border}`,
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
                <Tag color={opp.stage === "won" ? "success" : opp.stage === "lost" ? "error" : "blue"}>{opp.stage}</Tag>
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
