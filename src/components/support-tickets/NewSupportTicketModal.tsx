import { useEffect, useState } from "react";
import { App, Button, Input, Modal, Select, Space, Typography } from "antd";
import * as leadApi from "../../api/lead-api";
import * as supportTicketApi from "../../api/support-ticket-api";
import type { Lead } from "../../types/lead";
import type { SupportTicket } from "../../types/support-ticket";
import { errorMessageFrom } from "../../utils/api-error";
import { appTokens } from "../../utils/design-system";

const { Text } = Typography;

interface NewSupportTicketModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (ticket: SupportTicket) => void;
  /** Pre-select when launched from a specific lead (e.g. a "Raise ticket" button on a lead's own page). */
  defaultLeadId?: string;
}

export function NewSupportTicketModal({ open, onClose, onCreated, defaultLeadId }: NewSupportTicketModalProps) {
  const { message } = App.useApp();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [leadId, setLeadId] = useState<string | undefined>();
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    leadApi
      .listLeads({ limit: 100 })
      .then((result) => setLeads(result.leads))
      .catch(() => message.error("Failed to load leads"));
    setLeadId(defaultLeadId);
    setSubject("");
    setDescription("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const canSubmit = Boolean(leadId) && subject.trim().length > 0;

  const handleSubmit = async () => {
    if (!leadId) return;
    setSubmitting(true);
    try {
      const ticket = await supportTicketApi.createSupportTicket({
        leadId,
        subject: subject.trim(),
        description: description.trim() || undefined,
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

        <div>
          <Text style={{ fontSize: 12.5, fontWeight: 600, display: "block", marginBottom: 4, color: appTokens.textSecondary }}>
            Subject <span style={{ color: appTokens.danger }}>*</span>
          </Text>
          <Input placeholder="What's the issue?" value={subject} onChange={(e) => setSubject(e.target.value)} />
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
