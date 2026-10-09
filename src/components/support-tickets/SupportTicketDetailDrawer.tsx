import { useEffect, useRef, useState } from "react";
import { App, Button, Drawer, Input, Skeleton, Tag, Typography } from "antd";
import { SendOutlined, TagsOutlined } from "@ant-design/icons";
import * as supportTicketApi from "../../api/support-ticket-api";
import type { SupportTicket, SupportTicketMessage } from "../../types/support-ticket";
import { errorMessageFrom } from "../../utils/api-error";
import { appTokens } from "../../utils/design-system";
import { STATUS_COLORS } from "./support-ticket-constants";

const { Text, Title } = Typography;

interface SupportTicketDetailDrawerProps {
  ticketId: string | null;
  onClose: () => void;
}

function timeLabel(dateStr: string): string {
  return new Date(dateStr).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "numeric", minute: "2-digit" });
}

function Bubble({ msg }: { msg: SupportTicketMessage }) {
  const outbound = msg.direction === "outbound";
  return (
    <div style={{ display: "flex", justifyContent: outbound ? "flex-end" : "flex-start" }}>
      <div
        style={{
          maxWidth: "78%",
          padding: "9px 13px",
          borderRadius: outbound ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
          background: outbound ? appTokens.primary : appTokens.surface,
          border: outbound ? "none" : `1px solid ${appTokens.borderLight}`,
          boxShadow: appTokens.shadowXs,
        }}
      >
        <Text style={{ fontSize: 13.5, whiteSpace: "pre-wrap", wordBreak: "break-word", color: outbound ? "#fff" : appTokens.textPrimary, lineHeight: 1.45 }}>
          {msg.body}
        </Text>
        <Text style={{ display: "block", textAlign: "right", fontSize: 10.5, marginTop: 4, color: outbound ? "rgba(255,255,255,0.75)" : appTokens.textTertiary }}>
          {timeLabel(msg.createdAt)}
        </Text>
      </div>
    </div>
  );
}

export function SupportTicketDetailDrawer({ ticketId, onClose }: SupportTicketDetailDrawerProps) {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(true);
  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<SupportTicketMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = () => {
    if (!ticketId) return;
    setLoading(true);
    Promise.all([supportTicketApi.getSupportTicket(ticketId), supportTicketApi.listMessages(ticketId)])
      .then(([t, msgs]) => {
        setTicket(t);
        setMessages(msgs);
      })
      .catch(() => message.error("Failed to load this ticket"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    setTicket(null);
    setMessages([]);
    if (ticketId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketId]);

  // Status changes and new customer replies both arrive via Frappe's webhook,
  // not anything this drawer triggered - without polling, a real status
  // change or reply only ever shows up after closing and reopening the
  // drawer. No websocket infra exists elsewhere in this app (same
  // justification WhatsAppTab.tsx already uses for its own polling).
  useEffect(() => {
    if (!ticketId) return;
    const interval = setInterval(() => {
      Promise.all([supportTicketApi.getSupportTicket(ticketId), supportTicketApi.listMessages(ticketId)])
        .then(([t, fresh]) => {
          setTicket(t);
          setMessages((prev) => {
            const samePrevLast = prev[prev.length - 1]?.id;
            const sameFreshLast = fresh[fresh.length - 1]?.id;
            return fresh.length !== prev.length || sameFreshLast !== samePrevLast ? fresh : prev;
          });
        })
        .catch(() => undefined);
    }, 5000);
    return () => clearInterval(interval);
  }, [ticketId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  const handleSend = async () => {
    if (!ticketId) return;
    const body = draft.trim();
    if (!body) return;
    setSending(true);
    try {
      const sent = await supportTicketApi.replyToTicket(ticketId, body);
      setMessages((prev) => [...prev, sent]);
      setDraft("");
    } catch (err) {
      message.error(errorMessageFrom(err, "Failed to send reply"));
    } finally {
      setSending(false);
    }
  };

  return (
    <Drawer open={Boolean(ticketId)} onClose={onClose} width={560} destroyOnHidden closable={false} styles={{ body: { padding: 0, display: "flex", flexDirection: "column" } }}>
      {loading || !ticket ? (
        <div style={{ padding: 20 }}>
          <Skeleton active />
        </div>
      ) : (
        <>
          <div style={{ padding: "16px 20px", borderBottom: `1px solid ${appTokens.borderLight}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
              <div style={{ minWidth: 0 }}>
                <Title level={5} style={{ margin: 0, color: appTokens.textPrimary }}>
                  {ticket.subject}
                </Title>
                <Text style={{ fontSize: 12.5, color: appTokens.textSecondary }}>
                  {ticket.leadFullName ?? "Unknown customer"}
                  {ticket.frappeTicketName && (
                    <>
                      {" · "}
                      <TagsOutlined style={{ fontSize: 11 }} /> #{ticket.frappeTicketName}
                    </>
                  )}
                </Text>
              </div>
              <Tag color={STATUS_COLORS[ticket.status] ?? "default"} style={{ margin: 0, flexShrink: 0 }}>
                {ticket.status}
              </Tag>
            </div>
            {ticket.description && (
              <Text style={{ display: "block", marginTop: 8, fontSize: 13, color: appTokens.textSecondary, whiteSpace: "pre-wrap" }}>
                {ticket.description}
              </Text>
            )}
          </div>

          <div style={{ flex: 1, overflowY: "auto", background: appTokens.surfaceSunken, padding: "16px 18px", display: "flex", flexDirection: "column", gap: 8 }}>
            {messages.length === 0 && (
              <Text style={{ margin: "auto", color: appTokens.textTertiary, fontSize: 13 }}>No replies yet</Text>
            )}
            {messages.map((msg) => (
              <Bubble key={msg.id} msg={msg} />
            ))}
            <div ref={bottomRef} />
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center", padding: 12, borderTop: `1px solid ${appTokens.borderLight}` }}>
            <Input.TextArea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Type a reply..."
              autoSize={{ minRows: 1, maxRows: 4 }}
              style={{ borderRadius: 22, resize: "none", padding: "8px 16px", background: appTokens.surfaceMuted, border: "none" }}
              onPressEnter={(e) => {
                if (!e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
            <Button type="primary" shape="circle" icon={<SendOutlined />} loading={sending} onClick={handleSend} disabled={!draft.trim()} style={{ flexShrink: 0 }} />
          </div>
        </>
      )}
    </Drawer>
  );
}
