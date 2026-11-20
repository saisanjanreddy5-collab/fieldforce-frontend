import { useEffect, useRef, useState } from "react";
import { Avatar, Button, Drawer, Dropdown, Grid, Input, Tooltip, Typography, message } from "antd";
import type { MenuProps } from "antd";
import {
  ArrowDownOutlined,
  AudioOutlined,
  CheckOutlined,
  FileTextOutlined,
  FileImageOutlined,
  PaperClipOutlined,
  SendOutlined,
  WhatsAppOutlined,
} from "@ant-design/icons";
import { WhatsAppLogo } from "../icons/BrandIcons";
import * as whatsappApi from "../../api/whatsapp-api";
import type { WhatsappMessage } from "../../types/whatsapp";
import { errorMessageFrom } from "../../utils/api-error";
import { avatarGradient, appTokens } from "../../utils/design-system";
import { initials } from "../../utils/lead-format";

const { Text } = Typography;

interface WhatsAppThreadProps {
  // Primitive props, not a full Lead - WhatsApp is one thread per lead, and
  // Customers opens the same thread (every customer traces back to one lead)
  // without needing a full Lead object.
  leadId: string;
  fullName: string;
  phone: string | null;
  // Read-only unless the caller says otherwise: needs whatsapp.send, and on a
  // lead, owning it (a Call Center rep can still read a lead they handed off).
  canSend?: boolean;
}

interface WhatsAppDrawerProps extends WhatsAppThreadProps {
  open: boolean;
  onClose: () => void;
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

// mediaMimeType alone decides how to render it - no separate "type" column
// exists or is needed (see model.ts's own comment on why one more column
// here would just duplicate what the mime type already says).
// onLoad: a photo/video only gets its real height once loaded - the thread
// uses it to stay pinned to the newest message.
function MediaContent({ msg, outbound, onLoad }: { msg: WhatsappMessage; outbound: boolean; onLoad: () => void }) {
  if (!msg.mediaUrl) return null;
  const mime = msg.mediaMimeType ?? "";

  if (mime.startsWith("image/")) {
    return (
      <img
        src={msg.mediaUrl}
        alt={msg.mediaFileName ?? "photo"}
        onLoad={onLoad}
        style={{ display: "block", maxWidth: 240, maxHeight: 240, borderRadius: 10, objectFit: "cover" }}
      />
    );
  }
  if (mime.startsWith("video/")) {
    return <video src={msg.mediaUrl} controls onLoadedMetadata={onLoad} style={{ display: "block", maxWidth: 240, borderRadius: 10 }} />;
  }
  if (mime.startsWith("audio/")) {
    // Covers both a regular audio file and an actual voice note (K3's own
    // payload only tells the two apart via an inbound-only `voice` flag we
    // don't carry through to this row - rendered identically either way).
    return <audio src={msg.mediaUrl} controls style={{ display: "block", maxWidth: 240 }} />;
  }
  return (
    <a
      href={msg.mediaUrl}
      target="_blank"
      rel="noreferrer"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 10px",
        borderRadius: 8,
        background: outbound ? "rgba(255,255,255,0.14)" : appTokens.surfaceMuted,
        color: "inherit",
        textDecoration: "none",
      }}
    >
      <FileTextOutlined style={{ fontSize: 18 }} />
      <Text style={{ fontSize: 13, color: "inherit", wordBreak: "break-all" }}>{msg.mediaFileName ?? "Document"}</Text>
    </a>
  );
}

function Bubble({ msg, onMediaLoad }: { msg: WhatsappMessage; onMediaLoad: () => void }) {
  const outbound = msg.direction === "outbound";
  return (
    <div className="message-fade-in" style={{ display: "flex", justifyContent: outbound ? "flex-end" : "flex-start" }}>
      <div
        style={{
          maxWidth: "66%",
          padding: msg.mediaUrl && !msg.body ? 6 : "9px 13px",
          borderRadius: outbound ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
          background: outbound ? OUTBOUND_GRADIENT : appTokens.surface,
          border: outbound ? "none" : `1px solid ${appTokens.borderLight}`,
          boxShadow: outbound ? OUTBOUND_SHADOW : appTokens.shadowXs,
          display: "flex",
          flexDirection: "column",
          gap: 6,
        }}
      >
        <MediaContent msg={msg} outbound={outbound} onLoad={onMediaLoad} />
        {msg.body && (
          <Text style={{ fontSize: 14, whiteSpace: "pre-wrap", wordBreak: "break-word", color: outbound ? "#fff" : appTokens.textPrimary, lineHeight: 1.45, padding: msg.mediaUrl ? "0 6px" : 0 }}>
            {msg.body}
          </Text>
        )}
        <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 5, padding: msg.mediaUrl ? "0 6px 2px" : 0 }}>
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

// Messages + composer. Lives inside the drawer and is unmounted when it
// closes, so the 5-second refresh only runs while the chat is open.
function WhatsAppThread({ leadId, canSend = false }: Omit<WhatsAppThreadProps, "fullName" | "phone">) {
  const [messages, setMessages] = useState<WhatsappMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  // Follow new messages only while the reader is at the bottom - someone
  // scrolled up reading history isn't yanked down by an incoming reply.
  const pinnedToBottomRef = useRef(true);
  const [showJumpToLatest, setShowJumpToLatest] = useState(false);
  const photoVideoInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);

  const load = () => {
    setLoading(true);
    whatsappApi
      .listMessagesForLead(leadId)
      .then(setMessages)
      .catch((err) => message.error(errorMessageFrom(err, "Failed to load WhatsApp messages")))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leadId]);

  // Replies and delivered/read ticks arrive via the provider's webhook, so
  // the open chat checks for changes every 5 seconds (paused while the
  // browser tab is hidden). The list is only replaced when something
  // actually changed - a new message or a tick - so polling never jumps the
  // view while someone is reading older messages. A late answer for another
  // lead's chat is ignored.
  useEffect(() => {
    let active = true;
    const signature = (list: WhatsappMessage[]) => list.map((m) => `${m.id}:${m.status}`).join("|");
    const interval = setInterval(() => {
      if (document.hidden) return;
      whatsappApi
        .listMessagesForLead(leadId)
        .then((fresh) => {
          if (!active) return;
          setMessages((prev) => (signature(fresh) === signature(prev) ? prev : fresh));
        })
        .catch(() => undefined);
    }, 5000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [leadId]);

  // Scrolls only the message list, never the page behind the drawer.
  const scrollToLatest = (behavior: ScrollBehavior = "auto") => {
    const list = listRef.current;
    if (!list) return;
    list.scrollTo({ top: list.scrollHeight, behavior });
    pinnedToBottomRef.current = true;
    setShowJumpToLatest(false);
  };

  const followIfPinned = () => {
    if (pinnedToBottomRef.current) scrollToLatest();
  };

  useEffect(() => {
    followIfPinned();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  // Opening another lead starts at its newest message.
  useEffect(() => {
    pinnedToBottomRef.current = true;
  }, [leadId]);

  const handleListScroll = () => {
    const list = listRef.current;
    if (!list) return;
    const atBottom = list.scrollHeight - list.scrollTop - list.clientHeight < 80;
    pinnedToBottomRef.current = atBottom;
    setShowJumpToLatest(!atBottom);
  };

  const handleSend = async () => {
    const body = draft.trim();
    if (!body) return;
    setSending(true);
    pinnedToBottomRef.current = true;
    try {
      const sent = await whatsappApi.sendMessage(leadId, body);
      setMessages((prev) => [...prev, sent]);
      setDraft("");
    } catch (err) {
      message.error(errorMessageFrom(err, "Failed to send message"));
    } finally {
      setSending(false);
    }
  };

  // Whatever's already typed in the composer becomes the caption, same as
  // picking a file mid-message on a real phone keyboard - no separate
  // preview-and-caption screen exists here (that's a materially bigger UI
  // than what was asked for), so this is the one simplification worth
  // being upfront about.
  const handleSendMedia = async (file: File) => {
    setSending(true);
    pinnedToBottomRef.current = true;
    try {
      const sent = await whatsappApi.sendMedia(leadId, file, draft.trim() || undefined);
      setMessages((prev) => [...prev, sent]);
      setDraft("");
    } catch (err) {
      message.error(errorMessageFrom(err, "Failed to send attachment"));
    } finally {
      setSending(false);
    }
  };

  const attachMenuItems: MenuProps["items"] = [
    { key: "photo-video", icon: <FileImageOutlined />, label: "Photo or video", onClick: () => photoVideoInputRef.current?.click() },
    { key: "document", icon: <FileTextOutlined />, label: "Document", onClick: () => documentInputRef.current?.click() },
  ];

  let lastDay: string | null = null;

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Thread - the only part that scrolls. overscrollBehavior: contain
          stops a scroll that reaches the top/bottom from carrying on into
          the page behind the drawer. */}
      <div style={{ position: "relative", flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
        <div
          ref={listRef}
          onScroll={handleListScroll}
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
            overscrollBehavior: "contain",
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
                <Bubble msg={msg} onMediaLoad={followIfPinned} />
              </div>
            );
          })}
        </div>
        {showJumpToLatest && (
          <Tooltip title="Jump to latest">
            <Button
              shape="circle"
              icon={<ArrowDownOutlined />}
              onClick={() => scrollToLatest("smooth")}
              aria-label="Jump to latest message"
              style={{ position: "absolute", right: 16, bottom: 14, boxShadow: appTokens.shadowMd, borderColor: appTokens.borderLight }}
            />
          </Tooltip>
        )}
      </div>

      {/* Composer - fixed at the bottom of the drawer. */}
      <div
        style={{
          flexShrink: 0,
          display: "flex",
          gap: 10,
          alignItems: "center",
          padding: "12px 16px",
          background: appTokens.surface,
          borderTop: `1px solid ${appTokens.borderLight}`,
        }}
      >
        <input
          ref={photoVideoInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,video/mp4"
          style={{ display: "none" }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) handleSendMedia(file);
          }}
        />
        <input
          ref={documentInputRef}
          type="file"
          accept=".pdf,.doc,.docx,.xls,.xlsx"
          style={{ display: "none" }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) handleSendMedia(file);
          }}
        />
        <Dropdown menu={{ items: attachMenuItems }} trigger={["click"]} disabled={!canSend}>
          <Button
            shape="circle"
            icon={<PaperClipOutlined />}
            disabled={!canSend}
            style={{ flexShrink: 0, color: appTokens.textTertiary, borderColor: appTokens.borderLight }}
          />
        </Dropdown>
        <Input.TextArea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={canSend ? "Type a message..." : "You can read this conversation, but not send messages from here"}
          disabled={!canSend}
          autoSize={{ minRows: 1, maxRows: 4 }}
          style={{ borderRadius: 22, resize: "none", padding: "8px 16px", background: appTokens.surfaceMuted, border: "none" }}
          onPressEnter={(e) => {
            if (!e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
        />
        {/* Still genuinely disabled, not just unwired - sending a voice
            note isn't confirmed as something the WhatsApp provider's API
            can even do (see whatsapp-service.ts's own comment on this),
            unlike photo/video/document above which all have a real,
            documented send path. Receiving one already works; replying
            with one doesn't yet. */}
        <Tooltip title="Voice notes - waiting on confirmation from the WhatsApp provider that sending one back is possible">
          <Button
            shape="circle"
            icon={<AudioOutlined />}
            disabled
            style={{ flexShrink: 0, color: appTokens.textTertiary, borderColor: appTokens.borderLight }}
          />
        </Tooltip>
        <Button
          type="primary"
          shape="circle"
          icon={<SendOutlined />}
          loading={sending}
          onClick={handleSend}
          disabled={!canSend || !draft.trim()}
          style={{ flexShrink: 0, boxShadow: OUTBOUND_SHADOW }}
        />
      </div>
    </div>
  );
}

// WhatsApp opens as a full-height panel from the right - the same pattern as
// the Outlook email composer, and how Salesforce/HubSpot/Zoho show a
// conversation: the record stays where it is on the left, and the chat gets
// the whole screen height instead of the few lines left under the lead's
// details.
export function WhatsAppDrawer({ open, onClose, leadId, fullName, phone, canSend = false }: WhatsAppDrawerProps) {
  const screens = Grid.useBreakpoint();
  return (
    <Drawer
      open={open}
      onClose={onClose}
      size={screens.md === false ? "100%" : 480}
      destroyOnHidden
      styles={{
        header: { padding: "12px 16px" },
        title: { minWidth: 0, overflow: "hidden" },
        body: { padding: 0, display: "flex", flexDirection: "column", overflow: "hidden" },
      }}
      title={
        <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
          <Avatar shape="square" size={38} style={{ background: avatarGradient(fullName), borderRadius: appTokens.radiusSm, fontWeight: 600, fontSize: 14, flexShrink: 0 }}>
            {initials(fullName)}
          </Avatar>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
              <Text strong ellipsis style={{ fontSize: 15, color: appTokens.textPrimary, minWidth: 0 }}>
                {fullName}
              </Text>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 3,
                  flexShrink: 0,
                  fontSize: 10.5,
                  fontWeight: 700,
                  color: "#0e9f6e",
                  background: "#e7f9f1",
                  padding: "1px 7px",
                  borderRadius: 20,
                }}
              >
                <WhatsAppLogo size={11} />
                WhatsApp
              </span>
            </div>
            <Text style={{ fontSize: 12, fontWeight: 400, color: appTokens.textTertiary }}>{formatPhone(phone)}</Text>
          </div>
        </div>
      }
    >
      <WhatsAppThread leadId={leadId} canSend={canSend} />
    </Drawer>
  );
}
