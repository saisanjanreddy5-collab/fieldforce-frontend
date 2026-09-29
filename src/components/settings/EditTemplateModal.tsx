import { useEffect, useState } from "react";
import { Button, Input, Modal, Select, Typography, message } from "antd";
import * as messageTemplateApi from "../../api/message-template-api";
import type { MessageTemplate, TemplateStatus } from "../../types/message-template";
import { errorMessageFrom } from "../../utils/api-error";
import { appTokens } from "../../utils/design-system";

const { TextArea } = Input;
const { Text, Title } = Typography;

interface EditTemplateModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  /** null means "create a new one" */
  template: MessageTemplate | null;
}

export function EditTemplateModal({ open, onClose, onSaved, template }: EditTemplateModalProps) {
  const isNew = template === null;
  const [key, setKey] = useState("");
  const [name, setName] = useState("");
  const [triggerNote, setTriggerNote] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [status, setStatus] = useState<TemplateStatus>("active");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setKey(template?.key ?? "");
    setName(template?.name ?? "");
    setTriggerNote(template?.triggerNote ?? "");
    setSubject(template?.subject ?? "");
    setBody(template?.body ?? "");
    setStatus(template?.status ?? "active");
  }, [open, template]);

  const canSave = name.trim().length > 0 && body.trim().length > 0 && (!isNew || /^[a-z0-9_]+$/.test(key.trim()));

  const handleSave = async () => {
    setSaving(true);
    try {
      if (isNew) {
        await messageTemplateApi.createMessageTemplate({
          key: key.trim(),
          name: name.trim(),
          channel: "email",
          triggerNote: triggerNote.trim() || undefined,
          subject: subject.trim() || undefined,
          body,
          status,
        });
        message.success("Template created");
      } else {
        await messageTemplateApi.updateMessageTemplate(template.key, {
          name: name.trim(),
          triggerNote: triggerNote.trim() || null,
          subject: subject.trim() || null,
          body,
          status,
        });
        message.success("Template updated");
      }
      onSaved();
    } catch (err) {
      message.error(errorMessageFrom(err, "Failed to save template"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      width={520}
      styles={{ body: { maxHeight: "min(560px, 65vh)", overflowY: "auto", paddingRight: 4 } }}
      title={
        <Title level={5} style={{ margin: 0 }}>
          {isNew ? "New template" : `Edit ${template.name}`}
        </Title>
      }
      footer={
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="primary" loading={saving} disabled={!canSave} onClick={handleSave}>
            Save
          </Button>
        </div>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 8 }}>
        {isNew && (
          <div>
            <Text style={{ fontSize: 12, fontWeight: 500 }}>
              Key <span style={{ color: appTokens.danger }}>*</span>
            </Text>
            <Input
              style={{ marginTop: 4 }}
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="e.g. payment_reminder"
            />
            <Text style={{ fontSize: 11, color: appTokens.textTertiary }}>Lowercase letters, numbers and underscores only</Text>
          </div>
        )}
        <div>
          <Text style={{ fontSize: 12, fontWeight: 500 }}>Name</Text>
          <Input style={{ marginTop: 4 }} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Payment reminder" />
        </div>
        <div>
          <Text style={{ fontSize: 12, fontWeight: 500 }}>When it's used</Text>
          <Input style={{ marginTop: 4 }} value={triggerNote} onChange={(e) => setTriggerNote(e.target.value)} placeholder="e.g. 3 days before due date" />
        </div>
        <div>
          <Text style={{ fontSize: 12, fontWeight: 500 }}>Subject</Text>
          <Input style={{ marginTop: 4 }} value={subject} onChange={(e) => setSubject(e.target.value)} />
        </div>
        <div>
          <Text style={{ fontSize: 12, fontWeight: 500 }}>Body</Text>
          <TextArea style={{ marginTop: 4 }} rows={6} value={body} onChange={(e) => setBody(e.target.value)} />
          <Text style={{ fontSize: 11, color: appTokens.textTertiary }}>
            Use {"{{firstName}}"}, {"{{storeName}}"}, {"{{storeAddress}}"}, {"{{storeLine}}"}, {"{{visitTime}}"} or {"{{proposalDetails}}"} - filled in per lead when
            it's used.
          </Text>
        </div>
        <div>
          <Text style={{ fontSize: 12, fontWeight: 500 }}>Status</Text>
          <Select
            style={{ width: "100%", marginTop: 4 }}
            value={status}
            onChange={setStatus}
            options={[
              { value: "active", label: "Active" },
              { value: "draft", label: "Draft" },
            ]}
          />
        </div>
      </div>
    </Modal>
  );
}
