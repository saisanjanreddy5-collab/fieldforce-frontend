import { useEffect, useRef, useState } from "react";
import { Avatar, Button, Input, Tooltip, Typography, message } from "antd";
import { CheckOutlined, PaperClipOutlined, SendOutlined, WhatsAppOutlined } from "@ant-design/icons";
import * as whatsappApi from "../../../api/whatsapp-api";
import type { WhatsappMessage } from "../../../types/whatsapp";
import type { Lead } from "../../../types/lead";
import { errorMessageFrom } from "../../../utils/api-error";
import { avatarGradient, appTokens } from "../../../utils/design-system";
import { initials } from "../../../utils/lead-format";

const { Text } = Typography;

interface WhatsAppTabProps {
  lead: Lead;
}

// The outbound bubble reuses the app's own primary gradient (same one
// LeadSnapshot's "Recommended Next Step" banner uses) rather than WhatsApp's
// own green - a channel badge marks it as WhatsApp instead, so the widget
// reads as a native FieldForce feature, not a bolted-on WhatsApp clone.
const OUTBOUND_GRADIENT = `linear-gradient(135deg, ${appTokens.primary} 0%, #3f6fef 100%)`;
const OUTBOUND_SHADOW = "0 4px 14px rgba(19,84,224,0.22)";

function dayLabel(dateStr: string): string {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (sameDay(date, today)) return "Today";
  if (sameDay(date, yesterday)) return "Yesterday";
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });
}

function timeLabel(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
}

// Same 10-digit-Indian-number assumption the backend already makes
// (normalizePhone in lead-service.ts, the +91 prefix in whatsapp-service.ts)
// - just for display, formatted the way a real phone number actually reads
// instead of one long unbroken digit string.
function formatPhone(phone: string | null): string {
  if (!phone) return "No phone on file";
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  return phone;
}

function StatusTicks({ status }: { status: string }) {
  if (status === "failed") {
    return <Text style={{ fontSize: 10.5, color: "#ffd7d7", fontWeight: 600 }}>not delivered</Text>;
  }
  const opacity = status === "read" ? 1 : 0.55;
  const double = status === "delivered" || status === "read";
  return (
    <span style={{ display: "inline-flex", opacity }}>
      <CheckOutlined style={{ fontSize: 11, color: "#fff" }} />
      {double && <CheckOutlined style={{ fontSize: 11, color: "#fff", marginLeft: -6 }} />}
    </span>
  );
}

function Bubble({ msg }: { msg: WhatsappMessage }) {
  const outbound = msg.direction === "outbound";
  return (
    <div className="message-fade-in" style={{ display: "flex", justifyContent: outbound ? "flex-end" : "flex-start" }}>
      <div
        style={{
          maxWidth: "66%",
          padding: "9px 13px",
          borderRadius: outbound ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
          background: outbound ? OUTBOUND_GRADIENT : appTokens.surface,
          border: outbound ? "none" : `1px solid ${appTokens.borderLight}`,
          boxShadow: outbound ? OUTBOUND_SHADOW : appTokens.shadowXs,
        }}
      >
        <Text style={{ fontSize: 14, whiteSpace: "pre-wrap", wordBreak: "break-word", color: outbound ? "#fff" : appTokens.textPrimary, lineHeight: 1.45 }}>
          {msg.body}
        </Text>
        <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", marginTop: 4, gap: 5 }}>
          <Text style={{ fontSize: 10.5, color: outbound ? "rgba(255,255,255,0.75)" : appTokens.textTertiary }}>
            {timeLabel(msg.createdAt)}
          </Text>
          {outbound && <StatusTicks status={msg.status} />}
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div style={{ margin: "auto", textAlign: "center", padding: 32 }}>
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: "50%",
          background: appTokens.primarySoft,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 14px",
        }}
      >
        <WhatsAppOutlined style={{ fontSize: 24, color: appTokens.primary }} />
      </div>
      <Text strong style={{ fontSize: 14, display: "block", color: appTokens.textPrimary }}>
        No messages yet
      </Text>
      <Text style={{ fontSize: 12.5, color: appTokens.textTertiary }}>
        Start the conversation on WhatsApp below
      </Text>
    </div>
  );
}

export function WhatsAppTab({ lead }: WhatsAppTabProps) {
  const [messages, setMessages] = useState<WhatsappMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = () => {
    setLoading(true);
    whatsappApi
      .listMessagesForLead(lead.id)
      .then(setMessages)
      .catch((err) => message.error(errorMessageFrom(err, "Failed to load WhatsApp messages")))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lead.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  const handleSend = async () => {
    const body = draft.trim();
    if (!body) return;
    setSending(true);
    try {
      const sent = await whatsappApi.sendMessage(lead.id, body);
      setMessages((prev) => [...prev, sent]);
      setDraft("");
    } catch (err) {
      message.error(errorMessageFrom(err, "Failed to send message"));
    } finally {
      setSending(false);
    }
  };

  let lastDay: string | null = null;

  return (
    // No overflow:"hidden" here on purpose - that would clip to a new box
    // and break position:sticky for the header/composer below, since sticky
    // positioning is calculated against the nearest *scrolling* ancestor
    // (the detail pane around this whole tab), and any overflow other than
    // visible in between breaks that reference chain.
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        maxWidth: 760,
        borderRadius: appTokens.radiusLg,
        boxShadow: appTokens.shadowMd,
        border: `1px solid ${appTokens.borderLight}`,
      }}
    >
      {/* Header - sticky to the top of the scrolling detail pane, so the
          lead's identity stays visible no matter how far down the
          conversation the auto-scroll-to-latest lands. */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 1,
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "14px 16px",
          background: appTokens.surface,
          borderBottom: `1px solid ${appTokens.borderLight}`,
          borderTopLeftRadius: appTokens.radiusLg,
          borderTopRightRadius: appTokens.radiusLg,
        }}
      >
        <Avatar shape="square" size={40} style={{ background: avatarGradient(lead.fullName), borderRadius: appTokens.radiusSm, fontWeight: 600, fontSize: 14 }}>
          {initials(lead.fullName)}
        </Avatar>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <Text strong style={{ fontSize: 14, color: appTokens.textPrimary }}>
              {lead.fullName}
            </Text>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 3,
                fontSize: 10.5,
                fontWeight: 700,
                color: "#0e9f6e",
                background: "#e7f9f1",
                padding: "1px 7px",
                borderRadius: 20,
              }}
            >
              <WhatsAppOutlined style={{ fontSize: 10 }} />
              WhatsApp
            </span>
          </div>
          <Text style={{ fontSize: 12, color: appTokens.textTertiary }}>{formatPhone(lead.phone)}</Text>
        </div>
      </div>

      {/* Thread - the detail pane around this tab is what actually scrolls
          (same as every other tab), so this just grows with content rather
          than trying to own its own scroll region. The composer below is
          sticky, so it stays on screen regardless of how that outer scroll
          is positioned. */}
      <div
        style={{
          minHeight: 360,
          background: appTokens.surfaceSunken,
          padding: "16px 18px",
          display: "flex",
          flexDirection: "column",
          gap: 6,
        }}
      >
        {!loading && messages.length === 0 && <EmptyState />}
        {messages.map((msg) => {
          const day = dayLabel(msg.createdAt);
          const showDivider = day !== lastDay;
          lastDay = day;
          return (
            <div key={msg.id}>
              {showDivider && (
                <div style={{ display: "flex", justifyContent: "center", margin: "8px 0 12px" }}>
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: appTokens.textSecondary,
                      background: appTokens.surface,
                      padding: "4px 12px",
                      borderRadius: 20,
                      boxShadow: appTokens.shadowXs,
                    }}
                  >
                    {day}
                  </Text>
                </div>
              )}
              <Bubble msg={msg} />
            </div>
          );
        })}
        {/* scrollMarginBottom tells scrollIntoView to leave room below this
            marker for the composer's own height - without it, the browser
            scrolls the last message flush to the viewport edge with no
            regard for the sticky composer sitting on top of that same
            space, which is exactly what caused the overlap. */}
        <div ref={bottomRef} style={{ scrollMarginBottom: 76, scrollMarginTop: 76 }} />
      </div>

      {/* Composer - sticky to the bottom of the scrolling detail pane, so it
          stays visible without the user needing to scroll past the thread
          to find it, however long the conversation gets. */}
      <div
        style={{
          position: "sticky",
          bottom: 0,
          zIndex: 1,
          display: "flex",
          gap: 10,
          alignItems: "center",
          padding: 12,
          background: appTokens.surface,
          borderTop: `1px solid ${appTokens.borderLight}`,
          borderBottomLeftRadius: appTokens.radiusLg,
          borderBottomRightRadius: appTokens.radiusLg,
        }}
      >
        <Tooltip title="Attachments coming soon">
          <Button
            shape="circle"
            icon={<PaperClipOutlined />}
            disabled
            style={{ flexShrink: 0, color: appTokens.textTertiary, borderColor: appTokens.borderLight }}
          />
        </Tooltip>
        <Input.TextArea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Type a message..."
          autoSize={{ minRows: 1, maxRows: 4 }}
          style={{ borderRadius: 22, resize: "none", padding: "8px 16px", background: appTokens.surfaceMuted, border: "none" }}
          onPressEnter={(e) => {
            if (!e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
        />
        <Button
          type="primary"
          shape="circle"
          icon={<SendOutlined />}
          loading={sending}
          onClick={handleSend}
          disabled={!draft.trim()}
          style={{ flexShrink: 0, boxShadow: OUTBOUND_SHADOW }}
        />
      </div>
    </div>
  );
}
