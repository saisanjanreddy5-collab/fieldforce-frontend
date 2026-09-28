import { useEffect, useState } from "react";
import { Button, Drawer, Input, Typography, message } from "antd";
import { MailOutlined } from "@ant-design/icons";
import * as leadApi from "../../api/lead-api";
import * as microsoftApi from "../../api/microsoft-api";
import type { Lead } from "../../types/lead";
import type { MicrosoftConnectionStatus } from "../../types/microsoft";
import { EMAIL_TEMPLATES } from "../../utils/email-templates";
import { appTokens } from "../../utils/design-system";
import { errorMessageFrom } from "../../utils/api-error";

const { TextArea } = Input;
const { Text, Title } = Typography;

interface EmailComposeDrawerProps {
  open: boolean;
  onClose: () => void;
  leadId: string;
  activityDueDate: string | null;
  onSent: () => void;
}

// Always sends to the lead's own email on file - sendMailForLead (backend)
// has no "to" override, it looks up lead.email itself. The To field here is
// shown read-only for exactly that reason: an editable field the backend
// would silently ignore would be a real, deceptive bug, not a convenience.
export function EmailComposeDrawer({ open, onClose, leadId, activityDueDate, onSent }: EmailComposeDrawerProps) {
  const [lead, setLead] = useState<Lead | null>(null);
  const [msStatus, setMsStatus] = useState<MicrosoftConnectionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [templateKey, setTemplateKey] = useState("blank");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setTemplateKey("blank");
    setSubject("");
    setBody("");
    Promise.all([leadApi.getLead(leadId), microsoftApi.getStatus()])
      .then(([leadResult, statusResult]) => {
        setLead(leadResult);
        setMsStatus(statusResult);
      })
      .catch(() => message.error("Failed to load lead details"))
      .finally(() => setLoading(false));
  }, [open, leadId]);

  const applyTemplate = (key: string) => {
    setTemplateKey(key);
    if (!lead) return;
    const template = EMAIL_TEMPLATES.find((t) => t.key === key);
    if (!template) return;
    const { subject: s, body: b } = template.build(lead, activityDueDate);
    setSubject(s);
    setBody(b);
  };

  const canSend = Boolean(msStatus?.connected) && Boolean(lead?.email) && subject.trim().length > 0 && body.trim().length > 0;

  const handleSend = async () => {
    setSending(true);
    try {
      await microsoftApi.sendLeadEmail(leadId, subject.trim(), body);
      message.success("Email sent");
      onSent();
    } catch (err) {
      message.error(errorMessageFrom(err, "Failed to send email"));
    } finally {
      setSending(false);
    }
  };

  const handleConnect = async () => {
    const url = await microsoftApi.getConnectUrl(window.location.pathname);
    window.location.href = url;
  };

  const showConnectPrompt = !loading && msStatus !== null && !msStatus.connected;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width={480}
      loading={loading}
      title={
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: appTokens.radiusSm,
              background: appTokens.primarySoft,
              color: appTokens.primary,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <MailOutlined />
          </div>
          <div>
            <Title level={5} style={{ margin: 0 }}>
              New email
            </Title>
            <Text style={{ fontSize: 12, color: appTokens.textTertiary }}>
              {msStatus?.connected ? `Sends through Microsoft 365 as ${msStatus.email} · logs to this lead` : "Connect Microsoft 365 to send"}
            </Text>
          </div>
        </div>
      }
    >
      {showConnectPrompt ? (
        <div style={{ textAlign: "center", padding: "40px 16px" }}>
          <Text style={{ color: appTokens.textSecondary, display: "block", marginBottom: 16 }}>
            Connect your Microsoft 365 account to send email from FieldForce.
          </Text>
          <Button type="primary" onClick={handleConnect}>
            Connect Microsoft 365
          </Button>
        </div>
      ) : (
        !loading && (
          <>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
              {EMAIL_TEMPLATES.map((t) => {
                const active = templateKey === t.key;
                return (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => applyTemplate(t.key)}
                    style={{
                      padding: "5px 12px",
                      fontSize: 12.5,
                      fontFamily: appTokens.font,
                      fontWeight: active ? 600 : 500,
                      borderRadius: 999,
                      border: `1px solid ${active ? appTokens.primary : appTokens.border}`,
                      background: active ? appTokens.primarySoft : appTokens.surface,
                      color: active ? appTokens.primary : appTokens.textPrimary,
                      cursor: "pointer",
                    }}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <Text style={{ fontSize: 12, fontWeight: 500 }}>To</Text>
                <Input style={{ marginTop: 4 }} value={lead?.email ?? "No email on file for this lead"} disabled />
              </div>
              <div>
                <Text style={{ fontSize: 12, fontWeight: 500 }}>Subject</Text>
                <Input style={{ marginTop: 4 }} value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" />
              </div>
              <div>
                <Text style={{ fontSize: 12, fontWeight: 500 }}>Message</Text>
                <TextArea style={{ marginTop: 4 }} rows={10} value={body} onChange={(e) => setBody(e.target.value)} />
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 20 }}>
              <Button onClick={onClose}>Cancel</Button>
              <Button type="primary" loading={sending} disabled={!canSend} onClick={handleSend}>
                Send
              </Button>
            </div>
          </>
        )
      )}
    </Drawer>
  );
}
