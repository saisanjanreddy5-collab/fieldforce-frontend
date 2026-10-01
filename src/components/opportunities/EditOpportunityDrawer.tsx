import { useEffect, useState } from "react";
import { App, Button, Drawer, Empty, Form, Input, InputNumber, Select, Space, Spin, Tag, Typography } from "antd";
import { FileDoneOutlined } from "@ant-design/icons";
import * as opportunityApi from "../../api/opportunity-api";
import * as quoteApi from "../../api/quote-api";
import type { Opportunity } from "../../types/opportunity";
import type { QuoteListItem } from "../../types/quote";
import { useHasPermission } from "../../hooks/use-permission";
import { formatDate } from "../../utils/lead-format";
import { appTokens } from "../../utils/design-system";
import { QUOTE_STATUS_COLORS, QUOTE_STATUS_LABELS } from "../quotes/quote-constants";
import { NewQuoteModal } from "../quotes/NewQuoteModal";
import { QuoteDetailDrawer } from "../quotes/QuoteDetailDrawer";
import { STAGE_OPTIONS } from "./stages";

const { Text, Title } = Typography;

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
  const hasPermission = useHasPermission();
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm<FormValues>();

  const [quotes, setQuotes] = useState<QuoteListItem[]>([]);
  const [quotesLoading, setQuotesLoading] = useState(true);
  const [newQuoteOpen, setNewQuoteOpen] = useState(false);
  const [openQuoteId, setOpenQuoteId] = useState<string | null>(null);

  const loadQuotes = () => {
    if (!opportunity) return;
    setQuotesLoading(true);
    quoteApi
      .listQuotesForOpportunity(opportunity.id)
      .then(setQuotes)
      .catch(() => message.error("Failed to load quotes"))
      .finally(() => setQuotesLoading(false));
  };

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
    loadQuotes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
          {hasPermission("opportunities.update") && (
            <Button type="primary" loading={saving} onClick={() => form.submit()}>
              Save
            </Button>
          )}
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

      <div style={{ marginTop: 8, paddingTop: 16, borderTop: `1px solid ${appTokens.borderLight}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, gap: 8 }}>
          <Title level={5} style={{ margin: 0 }}>
            Quotes
          </Title>
          {hasPermission("quotes.create") && (
            <Button icon={<FileDoneOutlined />} onClick={() => setNewQuoteOpen(true)}>
              Create quote
            </Button>
          )}
        </div>
        {quotesLoading ? (
          <Spin />
        ) : quotes.length === 0 ? (
          <Empty description="No quotes yet" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {quotes.map((q) => (
              <div
                key={q.id}
                onClick={() => setOpenQuoteId(q.id)}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "10px 12px",
                  border: "1px solid #f0f0f0",
                  borderRadius: 8,
                  flexWrap: "wrap",
                  gap: 8,
                  cursor: "pointer",
                }}
              >
                <div>
                  <Text strong>{q.quoteLabel}</Text>
                  <div>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {formatDate(q.createdAt)}
                    </Text>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Text strong>{new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(q.grandTotal)}</Text>
                  <Tag color={QUOTE_STATUS_COLORS[q.status]}>{QUOTE_STATUS_LABELS[q.status]}</Tag>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {opportunity && (
        <NewQuoteModal
          open={newQuoteOpen}
          onClose={() => setNewQuoteOpen(false)}
          defaultLeadId={opportunity.leadId}
          defaultOpportunityId={opportunity.id}
          onCreated={(detail) => {
            setNewQuoteOpen(false);
            loadQuotes();
            setOpenQuoteId(detail.quote.id);
          }}
        />
      )}
      <QuoteDetailDrawer quoteId={openQuoteId} onClose={() => setOpenQuoteId(null)} onChanged={loadQuotes} />
    </Drawer>
  );
}
