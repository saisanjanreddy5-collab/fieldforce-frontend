import { useEffect, useState } from "react";
import { App, Button, Input, Modal, Select, Space, Typography } from "antd";
import * as leadApi from "../../api/lead-api";
import * as opportunityApi from "../../api/opportunity-api";
import * as quoteApi from "../../api/quote-api";
import type { Lead } from "../../types/lead";
import type { Opportunity } from "../../types/opportunity";
import type { QuoteDetail, QuoteLineItemInput } from "../../types/quote";
import { errorMessageFrom } from "../../utils/api-error";
import { appTokens } from "../../utils/design-system";
import { emptyLineItem, LineItemsEditor } from "./LineItemsEditor";

const { Text } = Typography;

interface NewQuoteModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (quote: QuoteDetail) => void;
  /** Pre-select when launched from a specific lead/opportunity (e.g. the "Create quote" button on an opportunity). */
  defaultLeadId?: string;
  defaultOpportunityId?: string;
}

export function NewQuoteModal({ open, onClose, onCreated, defaultLeadId, defaultOpportunityId }: NewQuoteModalProps) {
  const { message } = App.useApp();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [leadId, setLeadId] = useState<string | undefined>();
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [opportunityId, setOpportunityId] = useState<string | undefined>();
  const [loadingOpportunities, setLoadingOpportunities] = useState(false);
  const [lineItems, setLineItems] = useState<QuoteLineItemInput[]>([emptyLineItem()]);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    leadApi
      .listLeads({ limit: 100 })
      .then((result) => setLeads(result.leads))
      .catch(() => message.error("Failed to load leads"));
    setLeadId(defaultLeadId);
    setOpportunityId(defaultOpportunityId);
    setLineItems([emptyLineItem()]);
    setNotes("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!leadId) {
      setOpportunities([]);
      return;
    }
    setLoadingOpportunities(true);
    opportunityApi
      .listOpportunitiesForLead(leadId)
      .then((result) => {
        setOpportunities(result);
        // Keep the pre-selected opportunity only if it still belongs to this
        // lead - switching leads should never silently submit a stale
        // opportunity id from a previous selection.
        if (!result.some((o) => o.id === opportunityId)) setOpportunityId(undefined);
      })
      .catch(() => message.error("Failed to load this lead's opportunities"))
      .finally(() => setLoadingOpportunities(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leadId]);

  const validLineItems = lineItems.filter((i) => i.description.trim().length > 0 && i.quantity > 0);
  const canSubmit = Boolean(leadId) && Boolean(opportunityId) && validLineItems.length > 0;

  const handleSubmit = async () => {
    if (!leadId || !opportunityId) return;
    setSubmitting(true);
    try {
      const detail = await quoteApi.createQuote({
        leadId,
        opportunityId,
        lineItems: validLineItems,
        notes: notes.trim() || undefined,
      });
      message.success(`${detail.quote.quoteLabel} created`);
      onCreated(detail);
    } catch (err) {
      message.error(errorMessageFrom(err, "Failed to create quote"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title="New quote"
      open={open}
      onCancel={onClose}
      destroyOnHidden
      width={840}
      style={{ top: 24 }}
      footer={
        <Space style={{ display: "flex", justifyContent: "flex-end", width: "100%" }}>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="primary" loading={submitting} disabled={!canSubmit} onClick={handleSubmit}>
            Create quote
          </Button>
        </Space>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Always visible, never scrolls away - you should never lose sight
            of which lead/opportunity you're quoting while adding items. */}
        <div style={{ display: "flex", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <Text style={{ fontSize: 12.5, fontWeight: 600, display: "block", marginBottom: 4, color: appTokens.textSecondary }}>
              Lead <span style={{ color: appTokens.danger }}>*</span>
            </Text>
            <Select
              showSearch
              placeholder="Search by name, company, or city"
              optionFilterProp="label"
              disabled={Boolean(defaultLeadId)}
              value={leadId}
              onChange={setLeadId}
              style={{ width: "100%" }}
              options={leads.map((l) => ({
                value: l.id,
                label: `${l.fullName}${l.companyName ? ` — ${l.companyName}` : ""}${l.storeCity ? ` (${l.storeCity})` : ""}`,
              }))}
            />
          </div>
          <div style={{ flex: 1 }}>
            <Text style={{ fontSize: 12.5, fontWeight: 600, display: "block", marginBottom: 4, color: appTokens.textSecondary }}>
              Opportunity <span style={{ color: appTokens.danger }}>*</span>
            </Text>
            <Select
              placeholder={leadId ? "Select an opportunity" : "Select a lead first"}
              disabled={!leadId || Boolean(defaultOpportunityId)}
              loading={loadingOpportunities}
              value={opportunityId}
              onChange={setOpportunityId}
              style={{ width: "100%" }}
              notFoundContent={leadId && !loadingOpportunities ? "This lead has no opportunities yet" : undefined}
              options={opportunities.map((o) => ({ value: o.id, label: o.name ?? `${o.stage} deal` }))}
            />
          </div>
        </div>

        {/* Only this part scrolls, however many line items get added -
            scrollbar-gutter keeps the column widths from shifting the
            moment a scrollbar appears. */}
        <div style={{ maxHeight: "calc(100vh - 380px)", overflowY: "auto", scrollbarGutter: "stable", paddingRight: 2 }}>
          <div>
            <Text style={{ fontSize: 12.5, fontWeight: 600, display: "block", marginBottom: 6, color: appTokens.textSecondary }}>
              Line items
            </Text>
            <LineItemsEditor value={lineItems} onChange={setLineItems} />
          </div>

          <div style={{ marginTop: 16 }}>
            <Text style={{ fontSize: 12.5, fontWeight: 600, display: "block", marginBottom: 4, color: appTokens.textSecondary }}>
              Notes
            </Text>
            <Input.TextArea rows={2} placeholder="Shown on the quote - payment terms, validity, etc." value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
      </div>
    </Modal>
  );
}
