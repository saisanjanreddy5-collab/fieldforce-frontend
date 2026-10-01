import { useEffect, useState } from "react";
import { Button, Empty, Spin, Tag, Typography, message } from "antd";
import { FileDoneOutlined } from "@ant-design/icons";
import * as quoteApi from "../../../api/quote-api";
import type { QuoteListItem } from "../../../types/quote";
import { useHasPermission } from "../../../hooks/use-permission";
import { formatDate } from "../../../utils/lead-format";
import { QUOTE_STATUS_COLORS, QUOTE_STATUS_LABELS } from "../../quotes/quote-constants";
import { NewQuoteModal } from "../../quotes/NewQuoteModal";
import { QuoteDetailDrawer } from "../../quotes/QuoteDetailDrawer";

const { Text, Title } = Typography;

interface QuotesTabProps {
  leadId: string;
}

export function QuotesTab({ leadId }: QuotesTabProps) {
  const hasPermission = useHasPermission();
  const [quotes, setQuotes] = useState<QuoteListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newQuoteOpen, setNewQuoteOpen] = useState(false);
  const [openQuoteId, setOpenQuoteId] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    quoteApi
      .listQuotesForLead(leadId)
      .then(setQuotes)
      .catch(() => message.error("Failed to load quotes"))
      .finally(() => setLoading(false));
  };

  useEffect(load, [leadId]);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 7,
              background: "#0e9f6e",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              fontSize: 14,
              marginTop: 1,
            }}
          >
            <FileDoneOutlined />
          </div>
          <div>
            <Title level={5} style={{ margin: 0 }}>
              Quotes for this lead
            </Title>
            <Text type="secondary">{quotes.length} quote{quotes.length === 1 ? "" : "s"}</Text>
          </div>
        </div>
        {hasPermission("quotes.create") && (
          <Button type="primary" onClick={() => setNewQuoteOpen(true)}>
            + New quote
          </Button>
        )}
      </div>

      {loading ? (
        <Spin />
      ) : quotes.length === 0 ? (
        <Empty description="No quotes yet" />
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
                    {q.opportunityName ?? "No opportunity"} · {formatDate(q.createdAt)}
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

      <NewQuoteModal
        open={newQuoteOpen}
        onClose={() => setNewQuoteOpen(false)}
        defaultLeadId={leadId}
        onCreated={(detail) => {
          setNewQuoteOpen(false);
          load();
          setOpenQuoteId(detail.quote.id);
        }}
      />

      <QuoteDetailDrawer quoteId={openQuoteId} onClose={() => setOpenQuoteId(null)} onChanged={load} />
    </div>
  );
}
