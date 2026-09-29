import { useEffect, useState } from "react";
import { Button, Tag, Typography, message } from "antd";
import * as messageTemplateApi from "../../api/message-template-api";
import type { MessageTemplate } from "../../types/message-template";
import { appTokens } from "../../utils/design-system";
import { EditTemplateModal } from "./EditTemplateModal";

const { Text } = Typography;

export function TemplatesTab() {
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<MessageTemplate | null>(null);
  const [creating, setCreating] = useState(false);

  const load = () => {
    setLoading(true);
    messageTemplateApi
      .listMessageTemplates()
      .then(setTemplates)
      .catch(() => message.error("Failed to load templates"))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  return (
    <div
      style={{
        border: `1px solid ${appTokens.border}`,
        borderRadius: appTokens.radius,
        background: appTokens.surface,
        boxShadow: appTokens.shadowSm,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "14px 18px",
          borderBottom: `1px solid ${appTokens.borderLight}`,
        }}
      >
        <div>
          <Text strong style={{ fontSize: 14 }}>
            Email &amp; message templates
          </Text>
          <div>
            <Text style={{ fontSize: 12.5, color: appTokens.textTertiary }}>Used by the Activity calendar's email drawer and by agents from the lead record</Text>
          </div>
        </div>
      </div>

      {!loading &&
        templates.map((t, idx) => (
          <div
            key={t.key}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 18,
              padding: "14px 28px 14px 18px",
              borderBottom: idx === templates.length - 1 ? "none" : `1px solid ${appTokens.borderLight}`,
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <Text strong style={{ fontSize: 13.5 }}>
                {t.name}
              </Text>
              <div>
                <Text style={{ fontSize: 12, color: appTokens.textTertiary }}>{t.triggerNote ?? "Sent manually"}</Text>
              </div>
            </div>
            <Tag style={{ margin: 0, background: appTokens.surfaceMuted, border: "none", color: appTokens.textSecondary, textTransform: "capitalize" }}>
              {t.channel}
            </Tag>
            <Tag
              style={{
                margin: 0,
                border: "none",
                fontWeight: 600,
                color: t.status === "active" ? appTokens.success : appTokens.textTertiary,
                background: t.status === "active" ? `${appTokens.success}17` : appTokens.surfaceMuted,
              }}
            >
              {t.status === "active" ? "Active" : "Draft"}
            </Tag>
            <Button size="small" type="link" onClick={() => setEditing(t)}>
              Edit
            </Button>
          </div>
        ))}

      <div style={{ padding: "14px 18px" }}>
        <Button onClick={() => setCreating(true)}>+ Add template</Button>
      </div>

      <EditTemplateModal
        open={editing !== null || creating}
        onClose={() => {
          setEditing(null);
          setCreating(false);
        }}
        template={editing}
        onSaved={() => {
          setEditing(null);
          setCreating(false);
          load();
        }}
      />
    </div>
  );
}
