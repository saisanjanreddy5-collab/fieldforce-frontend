import { useState } from "react";
import { Button, Typography, message } from "antd";
import { CopyOutlined } from "@ant-design/icons";
import * as websiteLeadSourceApi from "../../api/website-lead-source-api";
import type { WebsiteLeadSource } from "../../types/website-lead-source";
import { errorMessageFrom } from "../../utils/api-error";
import { appTokens } from "../../utils/design-system";

const { Text } = Typography;

function endpointFor(apiKey: string): string {
  const base = (import.meta.env.VITE_API_BASE_URL as string).replace(/\/$/, "");
  return `${base}/public/website-leads/${apiKey}/submit`;
}

function integrationSnippet(source: WebsiteLeadSource): string {
  const endpoint = endpointFor(source.apiKey);
  return `// Call this when your enquiry form is submitted - no login/API key header needed,
// the key is part of the URL itself. Only fullName and phone are required.
fetch("${endpoint}", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    fullName: "Customer name",
    phone: "9999999999",
    email: "optional@example.com",
    message: "optional enquiry message",
    cityOrPincode: "optional",
    consentGranted: true // ${source.requireConsent ? "required - submission is rejected without this" : "optional for this source"}
  }),
});`;
}

async function copy(text: string, label: string) {
  try {
    await navigator.clipboard.writeText(text);
    message.success(`${label} copied`);
  } catch {
    message.error("Couldn't copy - your browser blocked clipboard access");
  }
}

interface WebsiteLeadSourceCardProps {
  source: WebsiteLeadSource;
  onEdit: () => void;
  onChanged: () => void;
}

export function WebsiteLeadSourceCard({ source, onEdit, onChanged }: WebsiteLeadSourceCardProps) {
  const [showIntegration, setShowIntegration] = useState(false);
  const [busy, setBusy] = useState(false);

  const toggleStatus = async () => {
    setBusy(true);
    try {
      await websiteLeadSourceApi.updateWebsiteLeadSource(source.id, { status: source.status === "active" ? "paused" : "active" });
      onChanged();
    } catch (err) {
      message.error(errorMessageFrom(err, "Failed to update this source"));
    } finally {
      setBusy(false);
    }
  };

  const statusColor = source.status === "active" ? appTokens.success : appTokens.textTertiary;

  return (
    <div
      style={{
        border: `1px solid ${appTokens.border}`,
        borderRadius: appTokens.radius,
        background: appTokens.surface,
        boxShadow: appTokens.shadowSm,
        padding: 16,
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <Text strong style={{ fontSize: 14 }}>
            {source.name}
          </Text>
          <div
            style={{
              display: "inline-block",
              marginLeft: 8,
              fontSize: 11,
              fontWeight: 600,
              color: statusColor,
              background: `${statusColor}17`,
              borderRadius: 6,
              padding: "1px 7px",
            }}
          >
            {source.status === "active" ? "Active" : "Paused"}
          </div>
          <div>
            <Text style={{ fontSize: 12, color: appTokens.textTertiary }}>
              {source.allowedOrigin || "No domain noted"} · {source.defaultCategory ?? "—"} · assigned to{" "}
              {source.defaultOwnerName ?? "Auto — by rule"}
            </Text>
          </div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <Text strong style={{ fontSize: 18, color: appTokens.primary }}>
            {source.leadsCount}
          </Text>
          <div>
            <Text style={{ fontSize: 11, color: appTokens.textTertiary }}>leads</Text>
          </div>
        </div>
      </div>

      {showIntegration && (
        <div style={{ background: appTokens.surfaceSunken, borderRadius: appTokens.radiusSm, padding: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <Text style={{ fontSize: 11, color: appTokens.textTertiary, fontWeight: 600 }}>SUBMISSION KEY (keep secret)</Text>
            <Button size="small" type="text" icon={<CopyOutlined />} onClick={() => copy(source.apiKey, "Key")} />
          </div>
          <Text code style={{ fontSize: 11, wordBreak: "break-all", display: "block", marginBottom: 10 }}>
            {source.apiKey}
          </Text>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <Text style={{ fontSize: 11, color: appTokens.textTertiary, fontWeight: 600 }}>INTEGRATION SNIPPET FOR THEIR DEVELOPER</Text>
            <Button size="small" type="text" icon={<CopyOutlined />} onClick={() => copy(integrationSnippet(source), "Snippet")} />
          </div>
          <pre style={{ fontSize: 11, margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-all", color: appTokens.textSecondary }}>
            {integrationSnippet(source)}
          </pre>
        </div>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        <Button size="small" onClick={onEdit}>
          Edit
        </Button>
        <Button size="small" onClick={() => setShowIntegration((v) => !v)}>
          {showIntegration ? "Hide integration details" : "Get integration details"}
        </Button>
        <Button size="small" danger={source.status === "active"} loading={busy} onClick={toggleStatus}>
          {source.status === "active" ? "Pause" : "Activate"}
        </Button>
      </div>
    </div>
  );
}
