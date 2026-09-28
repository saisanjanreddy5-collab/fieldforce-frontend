import { useEffect, useState } from "react";
import { Button, DatePicker, Input, Modal, Select, Typography, message } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import * as activityApi from "../../api/activity-api";
import * as leadApi from "../../api/lead-api";
import type { ActivityType } from "../../types/activity";
import type { Lead } from "../../types/lead";
import { ALL_ACTIVITY_TYPES, TYPE_DOT_COLOR, TYPE_ICON, TYPE_LABEL } from "../../utils/activity-shared";
import { appTokens } from "../../utils/design-system";
import { errorMessageFrom } from "../../utils/api-error";

const { Text, Title } = Typography;

interface NewActivityModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  assignedToId: string;
  assignedToName: string;
}

// Every activity must be linked to a lead (the DB requires lead_id or
// opportunity_id), so this searches leads the same way NewExpenseClaimModal
// searches opportunities - the calendar itself has no lead context to
// borrow, unlike the per-lead Activity tab this reuses createActivityForLead
// from.
export function NewActivityModal({ open, onClose, onCreated, assignedToId, assignedToName }: NewActivityModalProps) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [leadSearch, setLeadSearch] = useState("");
  const [leadId, setLeadId] = useState<string | undefined>();
  const [type, setType] = useState<ActivityType>("call");
  const [subject, setSubject] = useState("");
  const [dueDate, setDueDate] = useState<Dayjs | null>(dayjs().add(1, "hour").minute(0));
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLeadId(undefined);
    setLeadSearch("");
    setType("call");
    setSubject("");
    setDueDate(dayjs().add(1, "hour").minute(0));
    leadApi.listLeads({}).then((r) => setLeads(r.leads)).catch(() => undefined);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handle = setTimeout(() => {
      leadApi
        .listLeads({ search: leadSearch || undefined })
        .then((r) => setLeads(r.leads))
        .catch(() => undefined);
    }, 250);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leadSearch]);

  const canSubmit = leadId !== undefined && subject.trim().length > 0 && dueDate !== null;

  const handleSubmit = async () => {
    if (!leadId || !dueDate) return;
    setSubmitting(true);
    try {
      await activityApi.createActivityForLead(leadId, {
        type,
        subject: subject.trim(),
        dueDate: dueDate.toISOString(),
        assignedTo: assignedToId,
      });
      message.success("Activity scheduled");
      onCreated();
    } catch (err) {
      message.error(errorMessageFrom(err, "Failed to schedule the activity"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      width={480}
      footer={null}
      title={
        <div>
          <Title level={5} style={{ margin: 0 }}>
            New activity
          </Title>
          <Text style={{ fontSize: 12, color: appTokens.textTertiary }}>Scheduled for {assignedToName}</Text>
        </div>
      }
    >
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8, marginBottom: 16 }}>
        {ALL_ACTIVITY_TYPES.map((t) => {
          const active = type === t;
          return (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "5px 10px",
                fontSize: 12.5,
                fontFamily: appTokens.font,
                fontWeight: active ? 600 : 500,
                borderRadius: 999,
                border: `1px solid ${active ? TYPE_DOT_COLOR[t] : appTokens.border}`,
                background: appTokens.surface,
                color: active ? TYPE_DOT_COLOR[t] : appTokens.textPrimary,
                cursor: "pointer",
              }}
            >
              {TYPE_ICON[t]}
              {TYPE_LABEL[t]}
            </button>
          );
        })}
      </div>

      <div>
        <Text style={{ fontSize: 12.5, fontWeight: 500 }}>
          Lead <span style={{ color: appTokens.danger }}>*</span>
        </Text>
        <Select
          style={{ width: "100%", marginTop: 4 }}
          showSearch
          filterOption={false}
          placeholder="Search leads by name"
          value={leadId}
          onSearch={setLeadSearch}
          onChange={setLeadId}
          options={leads.map((l) => ({ value: l.id, label: l.fullName }))}
        />
      </div>

      <div>
        <Text style={{ fontSize: 12.5, fontWeight: 500, marginTop: 12, display: "block" }}>
          What's it for <span style={{ color: appTokens.danger }}>*</span>
        </Text>
        <Input style={{ marginTop: 4 }} value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Proposal review with RSM" />
      </div>

      <div>
        <Text style={{ fontSize: 12.5, fontWeight: 500, marginTop: 12, display: "block" }}>
          When <span style={{ color: appTokens.danger }}>*</span>
        </Text>
        <DatePicker showTime style={{ width: "100%", marginTop: 4 }} value={dueDate} onChange={setDueDate} format="D MMM YYYY, h:mm A" />
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 20 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button type="primary" loading={submitting} disabled={!canSubmit} onClick={handleSubmit}>
          Schedule activity
        </Button>
      </div>
    </Modal>
  );
}
