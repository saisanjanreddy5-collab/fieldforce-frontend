import { useEffect, useRef, useState } from "react";
import { Button, Drawer, Input, Select, Typography, message } from "antd";
import { CloseOutlined, PaperClipOutlined } from "@ant-design/icons";
import { OutlookLogo } from "../icons/BrandIcons";
import * as leadApi from "../../api/lead-api";
import * as microsoftApi from "../../api/microsoft-api";
import * as messageTemplateApi from "../../api/message-template-api";
import type { Lead } from "../../types/lead";
import type { MicrosoftConnectionStatus } from "../../types/microsoft";
import type { MessageTemplate } from "../../types/message-template";
import { applyTemplateTokens, templateTokens } from "../../utils/email-templates";
import { appTokens } from "../../utils/design-system";
import { errorMessageFrom } from "../../utils/api-error";

const BLANK_TEMPLATE_KEY = "blank";
// Matches the backend's emailAttachmentUpload limits exactly (microsoft-service.ts)
// - Graph's simple inline-attachment sendMail tops out around 3MB per file.
const MAX_ATTACHMENT_SIZE = 3 * 1024 * 1024;
const MAX_ATTACHMENTS = 5;

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const { TextArea } = Input;
const { Text, Title } = Typography;

interface EmailComposeDrawerProps {
  open: boolean;
  onClose: () => void;
  leadId: string;
  activityDueDate: string | null;
  onSent: () => void;
  // When set, targets this specific address (e.g. one of a customer's own
  // contacts) instead of the lead's own email on file - sendMailForLead
  // (backend) now accepts this as an explicit override, still logged
  // against the same lead either way. overrideName is display-only, shown
  // alongside the address in the read-only "To" field below.
  overrideEmail?: string | null;
  overrideName?: string | null;
}

// Without an override, this always sends to the lead's own email on file -
// sendMailForLead only uses something else when explicitly told to via
// overrideEmail. The To field here is shown read-only either way: an
// editable field the backend would silently ignore (or silently send
// somewhere the field doesn't show) would be a real, deceptive bug, not a
// convenience - what's displayed must always be exactly what's used.
export function EmailComposeDrawer({ open, onClose, leadId, activityDueDate, onSent, overrideEmail, overrideName }: EmailComposeDrawerProps) {
  const [lead, setLead] = useState<Lead | null>(null);
  const [msStatus, setMsStatus] = useState<MicrosoftConnectionStatus | null>(null);
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [templateKey, setTemplateKey] = useState(BLANK_TEMPLATE_KEY);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [cc, setCc] = useState<string[]>([]);
  const [attachments, setAttachments] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setTemplateKey(BLANK_TEMPLATE_KEY);
    setSubject("");
    setBody("");
    setCc([]);
    setAttachments([]);
    // Templates are a nice-to-have (a role without message_templates.view -
    // e.g. Call Center - simply gets a blank-email-only compose panel), not
    // essential like the lead/recipient itself - fetched separately so a
    // 403 on that one call can't take down the whole drawer the way a
    // single combined Promise.all did (that failure mode is exactly what
    // made "No email on file for this lead" show up for a lead that
    // actually had an email on file - the lead fetch had succeeded, its
    // result just never reached state because Promise.all rejects as soon
    // as any one of its promises does).
    Promise.all([leadApi.getLead(leadId), microsoftApi.getStatus()])
      .then(([leadResult, statusResult]) => {
        setLead(leadResult);
        setMsStatus(statusResult);
      })
      .catch(() => message.error("Failed to load lead details"))
      .finally(() => setLoading(false));
    messageTemplateApi
      .listMessageTemplates("email")
      .then((templatesResult) => setTemplates(templatesResult.filter((t) => t.status === "active")))
      .catch(() => setTemplates([]));
  }, [open, leadId]);

  const applyTemplate = (key: string) => {
    setTemplateKey(key);
    if (key === BLANK_TEMPLATE_KEY) {
      // Switching back to "Blank email" must actually blank the fields -
      // previously this returned early and left whichever template's text
      // was last applied sitting in the form while the pill looked blank.
      setSubject("");
      setBody("");
      return;
    }
    if (!lead) return;
    const template = templates.find((t) => t.key === key);
    if (!template) return;
    const tokens = templateTokens(lead, activityDueDate);
    setSubject(template.subject ? applyTemplateTokens(template.subject, tokens) : "");
    setBody(applyTemplateTokens(template.body, tokens));
  };

  const recipient = overrideEmail ?? lead?.email ?? null;
  const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const ccAllValid = cc.every((e) => EMAIL_SHAPE.test(e));
  const canSend =
    Boolean(msStatus?.connected) && Boolean(recipient) && subject.trim().length > 0 && body.trim().length > 0 && ccAllValid;

  const handleSend = async () => {
    setSending(true);
    try {
      await microsoftApi.sendLeadEmail(leadId, subject.trim(), body, attachments, overrideEmail ?? undefined, cc);
      message.success(cc.length > 0 ? `Email sent (cc: ${cc.length})` : "Email sent");
      onSent();
    } catch (err) {
      message.error(errorMessageFrom(err, "Failed to send email"));
    } finally {
      setSending(false);
    }
  };

  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (picked.length === 0) return;
    setAttachments((prev) => {
      const next = [...prev];
      for (const file of picked) {
        if (next.length >= MAX_ATTACHMENTS) {
          message.error(`You can attach up to ${MAX_ATTACHMENTS} files`);
          break;
        }
        if (file.size > MAX_ATTACHMENT_SIZE) {
          message.error(`${file.name} is larger than 3 MB`);
          continue;
        }
        next.push(file);
      }
      return next;
    });
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
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
      styles={{ body: { paddingBottom: 12, display: "flex", flexDirection: "column", overflow: "hidden" } }}
      footer={
        !showConnectPrompt && !loading ? (
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <Button onClick={onClose}>Cancel</Button>
            <Button type="primary" loading={sending} disabled={!canSend} onClick={handleSend}>
              Send
            </Button>
          </div>
        ) : null
      }
      title={
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: appTokens.radiusSm,
              background: appTokens.primarySoft,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <OutlookLogo size={18} />
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
          <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
            <Text style={{ fontSize: 11, fontWeight: 600, color: appTokens.textTertiary, textTransform: "uppercase", letterSpacing: 0.4, display: "block", marginBottom: 6 }}>
              Template
            </Text>
            <div style={{ display: "flex", gap: 8, flexWrap: "nowrap", overflowX: "auto", marginBottom: 14, flexShrink: 0, paddingBottom: 2 }}>
              {[...templates, { key: BLANK_TEMPLATE_KEY, name: "Blank email" }].map((t) => {
                const active = templateKey === t.key;
                return (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => applyTemplate(t.key)}
                    style={{
                      padding: "6px 14px",
                      fontSize: 12.5,
                      fontFamily: appTokens.font,
                      fontWeight: active ? 600 : 500,
                      borderRadius: 999,
                      border: `1px solid ${active ? appTokens.primary : appTokens.border}`,
                      background: active ? appTokens.primarySoft : appTokens.surface,
                      color: active ? appTokens.primary : appTokens.textSecondary,
                      boxShadow: active ? "none" : appTokens.shadowXs,
                      cursor: "pointer",
                      flexShrink: 0,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {t.name}
                  </button>
                );
              })}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14, flex: 1, minHeight: 0 }}>
              <div style={{ flexShrink: 0 }}>
                <Text style={{ fontSize: 11, fontWeight: 600, color: appTokens.textTertiary, textTransform: "uppercase", letterSpacing: 0.4 }}>To</Text>
                <div
                  style={{
                    marginTop: 5,
                    padding: "7px 11px",
                    borderRadius: appTokens.radiusSm,
                    background: appTokens.surfaceMuted,
                    border: `1px solid ${appTokens.borderLight}`,
                    fontSize: 14,
                    color: recipient ? appTokens.textPrimary : appTokens.textTertiary,
                  }}
                >
                  {recipient ? (overrideName ? `${overrideName} <${recipient}>` : recipient) : "No email on file for this lead"}
                </div>
              </div>
              <div style={{ flexShrink: 0 }}>
                <Text style={{ fontSize: 11, fontWeight: 600, color: appTokens.textTertiary, textTransform: "uppercase", letterSpacing: 0.4 }}>
                  Cc
                </Text>
                <Select
                  mode="tags"
                  style={{ width: "100%", marginTop: 5 }}
                  value={cc}
                  onChange={setCc}
                  tokenSeparators={[",", ";", " "]}
                  placeholder="Add a CC address and press Enter"
                  suffixIcon={null}
                  dropdownStyle={{ display: "none" }}
                  status={!ccAllValid ? "error" : undefined}
                />
                {!ccAllValid && (
                  <Text style={{ fontSize: 11.5, color: appTokens.danger, display: "block", marginTop: 3 }}>
                    One of these doesn't look like a valid email address
                  </Text>
                )}
              </div>
              <div style={{ flexShrink: 0 }}>
                <Text style={{ fontSize: 11, fontWeight: 600, color: appTokens.textTertiary, textTransform: "uppercase", letterSpacing: 0.4 }}>
                  Subject
                </Text>
                <Input style={{ marginTop: 5 }} value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" />
              </div>
              <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 110 }}>
                <Text style={{ fontSize: 11, fontWeight: 600, color: appTokens.textTertiary, textTransform: "uppercase", letterSpacing: 0.4 }}>
                  Message
                </Text>
                <TextArea
                  style={{ marginTop: 5, flex: 1, resize: "none" }}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                />
              </div>
              <div style={{ flexShrink: 0 }}>
                <Text style={{ fontSize: 11, fontWeight: 600, color: appTokens.textTertiary, textTransform: "uppercase", letterSpacing: 0.4 }}>
                  Attachments
                </Text>
                <div style={{ marginTop: 5, display: "flex", flexDirection: "column", gap: 6, maxHeight: 110, overflowY: "auto" }}>
                  {attachments.map((file, index) => (
                    <div
                      key={`${file.name}-${index}`}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 8,
                        padding: "6px 10px",
                        borderRadius: appTokens.radiusSm,
                        background: appTokens.surfaceMuted,
                        border: `1px solid ${appTokens.borderLight}`,
                        flexShrink: 0,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                        <PaperClipOutlined style={{ color: appTokens.textTertiary, flexShrink: 0 }} />
                        <Text
                          style={{ fontSize: 13, color: appTokens.textPrimary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                        >
                          {file.name}
                        </Text>
                        <Text style={{ fontSize: 12, color: appTokens.textTertiary, flexShrink: 0 }}>{formatFileSize(file.size)}</Text>
                      </div>
                      <Button type="text" size="small" icon={<CloseOutlined />} onClick={() => removeAttachment(index)} />
                    </div>
                  ))}
                  <input ref={fileInputRef} type="file" multiple style={{ display: "none" }} onChange={handleFilesSelected} />
                  {attachments.length < MAX_ATTACHMENTS && (
                    <Button
                      icon={<PaperClipOutlined />}
                      onClick={() => fileInputRef.current?.click()}
                      style={{ alignSelf: "flex-start", flexShrink: 0 }}
                    >
                      Attach file
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )
      )}
    </Drawer>
  );
}
