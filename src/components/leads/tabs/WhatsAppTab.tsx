import { useEffect, useRef, useState } from "react";
import { Button, Empty, Input, Spin, Typography, message } from "antd";
import { SendOutlined, WhatsAppOutlined } from "@ant-design/icons";
import * as whatsappApi from "../../../api/whatsapp-api";
import type { WhatsappMessage } from "../../../types/whatsapp";
import { errorMessageFrom } from "../../../utils/api-error";
import { formatDateTime } from "../../../utils/lead-format";

const { Text } = Typography;

interface WhatsAppTabProps {
  leadId: string;
}

function Bubble({ message: msg }: { message: WhatsappMessage }) {
  const outbound = msg.direction === "outbound";
  return (
    <div style={{ display: "flex", justifyContent: outbound ? "flex-end" : "flex-start" }}>
      <div
        style={{
          maxWidth: "70%",
          padding: "8px 12px",
          borderRadius: 10,
          background: outbound ? "#dcf8c6" : "#fff",
          border: outbound ? "none" : "1px solid #f0f0f0",
        }}
      >
        <Text style={{ fontSize: 13, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{msg.body}</Text>
        <div style={{ marginTop: 4, textAlign: "right" }}>
          <Text type="secondary" style={{ fontSize: 10 }}>
            {formatDateTime(msg.createdAt)}
            {outbound ? ` · ${msg.status}` : ""}
          </Text>
        </div>
      </div>
    </div>
  );
}

export function WhatsAppTab({ leadId }: WhatsAppTabProps) {
  const [messages, setMessages] = useState<WhatsappMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  const handleSend = async () => {
    const body = draft.trim();
    if (!body) return;
    setSending(true);
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

  if (loading) return <Spin />;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: 480, maxWidth: 720 }}>
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          background: "#f5f5f5",
          borderRadius: 8,
          padding: 16,
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        {messages.length === 0 ? (
          <Empty
            image={<WhatsAppOutlined style={{ fontSize: 32, color: "#bfbfbf" }} />}
            description="No WhatsApp messages yet"
            style={{ margin: "auto" }}
          />
        ) : (
          messages.map((msg) => <Bubble key={msg.id} message={msg} />)
        )}
        <div ref={bottomRef} />
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <Input.TextArea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Type a message..."
          autoSize={{ minRows: 1, maxRows: 4 }}
          onPressEnter={(e) => {
            if (!e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
        />
        <Button type="primary" icon={<SendOutlined />} loading={sending} onClick={handleSend} disabled={!draft.trim()} />
      </div>
    </div>
  );
}
