import { useEffect, useState } from "react";
import { App, Button, Input, Modal, Select, Space, Typography } from "antd";
import * as leadApi from "../../api/lead-api";
import * as supportTicketApi from "../../api/support-ticket-api";
import type { Lead } from "../../types/lead";
import type { SupportTicket } from "../../types/support-ticket";
import { errorMessageFrom } from "../../utils/api-error";
import { appTokens } from "../../utils/design-system";
import { TICKET_PRIORITIES } from "./support-ticket-constants";

const { Text } = Typography;

interface NewSupportTicketModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (ticket: SupportTicket) => void;
  /** Pre-select when launched from a specific lead (e.g. a "Raise ticket" button on a lead's own page). */
  defaultLeadId?: string;
}

// A ticket can only be raised for a lead that's actually a confirmed
// prospect or customer, not someone still being worked by Call Center -
// matches the same "Qualified or Converted" rule support-ticket-service.ts
// enforces server-side in createTicketForLead.
const TICKET_ELIGIBLE_LEAD_STATUSES = "Qualified,Converted";

export function NewSupportTicketModal({ open, onClose, onCreated, defaultLeadId }: NewSupportTicketModalProps) {
  const { message } = App.useApp();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [leadSearch, setLeadSearch] = useState("");
  const [leadId, setLeadId] = useState<string | undefined>();
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<string>("Medium");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    leadApi
      .listLeads({ status: TICKET_ELIGIBLE_LEAD_STATUSES })
      .then((result) => setLeads(result.leads))
      .catch(() => message.error("Failed to load leads"));
    setLeadId(defaultLeadId);
    setLeadSearch("");
    setSubject("");
    setDescription("");
    setPriority("Medium");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handle = setTimeout(() => {
      leadApi
        .listLeads({ status: TICKET_ELIGIBLE_LEAD_STATUSES, search: leadSearch || undefined })
        .then((result) => setLeads(result.leads))
        .catch(() => undefined);
    }, 250);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leadSearch]);

  const canSubmit = Boolean(leadId) && subject.trim().length > 0;

  const handleSubmit = async () => {
    if (!leadId) return;
    setSubmitting(true);
    try {
      const ticket = await supportTicketApi.createSupportTicket({
        leadId,
        subject: subject.trim(),
        description: description.trim() || undefined,
        priority,
      });
      message.success("Ticket raised");
      onCreated(ticket);
    } catch (err) {
      message.error(errorMessageFrom(err, "Failed to raise ticket"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title="New ticket"
      open={open}
      onCancel={onClose}
      destroyOnHidden
      width={560}
      footer={
        <Space style={{ display: "flex", justifyContent: "flex-end", width: "100%" }}>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="primary" loading={submitting} disabled={!canSubmit} onClick={handleSubmit}>
            Raise ticket
          </Button>
        </Space>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <Text style={{ fontSize: 12.5, fontWeight: 600, display: "block", marginBottom: 4, color: appTokens.textSecondary }}>
            Customer <span style={{ color: appTokens.danger }}>*</span>
          </Text>
          <Select
            showSearch
            placeholder="Search by name, company, or city"
            filterOption={false}
            disabled={Boolean(defaultLeadId)}
            value={leadId}
            onSearch={setLeadSearch}
            onChange={setLeadId}
            style={{ width: "100%" }}
            options={leads.map((l) => ({
              value: l.id,
              label: `${l.fullName}${l.companyName ? ` — ${l.companyName}` : ""}${l.storeCity ? ` (${l.storeCity})` : ""}`,
            }))}
            notFoundContent="No qualified customers match that search"
          />
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <Text style={{ fontSize: 12.5, fontWeight: 600, display: "block", marginBottom: 4, color: appTokens.textSecondary }}>
              Subject <span style={{ color: appTokens.danger }}>*</span>
            </Text>
            <Input placeholder="What's the issue?" value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>
          <div style={{ width: 140 }}>
            <Text style={{ fontSize: 12.5, fontWeight: 600, display: "block", marginBottom: 4, color: appTokens.textSecondary }}>
              Priority <span style={{ color: appTokens.danger }}>*</span>
            </Text>
            <Select
              value={priority}
              onChange={setPriority}
              style={{ width: "100%" }}
              options={TICKET_PRIORITIES.map((p) => ({ value: p, label: p }))}
            />
          </div>
        </div>

        <div>
          <Text style={{ fontSize: 12.5, fontWeight: 600, display: "block", marginBottom: 4, color: appTokens.textSecondary }}>
            Description
          </Text>
          <Input.TextArea
            rows={4}
            placeholder="Details the support team will need"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
      </div>
    </Modal>
  );
}
