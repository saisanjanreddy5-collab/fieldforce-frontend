import { useEffect, useState } from "react";
import { Button, Dropdown, Typography, message } from "antd";
import { DownOutlined } from "@ant-design/icons";
import QRCode from "qrcode";
import * as qrCampaignApi from "../../api/qr-campaign-api";
import type { QrCampaign } from "../../types/qr-campaign";
import { errorMessageFrom } from "../../utils/api-error";
import { appTokens } from "../../utils/design-system";

const { Text } = Typography;

function publicUrlFor(code: string): string {
  return `${window.location.origin}/f/${code}`;
}

interface QrCampaignCardProps {
  campaign: QrCampaign;
  onEdit: () => void;
  onChanged: () => void;
}

// Every code here is real and scannable - it encodes this exact frontend
// origin's /f/:code route, generated client-side (qrcode) from the same
// data the "Print sheet"/"Download" actions use, so there's nothing baked
// into the image that the backend doesn't actually serve.
export function QrCampaignCard({ campaign, onEdit, onChanged }: QrCampaignCardProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const url = campaign.code ? publicUrlFor(campaign.code) : null;

  useEffect(() => {
    if (!url) return;
    // Plain black/white (the library's default) - a tinted brand color here
    // would just make it less reliably scannable for no real benefit, and
    // qrcode's color option only accepts hex anyway (an earlier rgba() value
    // silently threw here, which is why the QR image wasn't rendering).
    QRCode.toDataURL(url, { width: 240, margin: 1 })
      .then(setDataUrl)
      .catch(() => setDataUrl(null));
  }, [url]);

  const download = async (format: "png" | "svg") => {
    if (!url) return;
    const link = document.createElement("a");
    if (format === "png" && dataUrl) {
      link.href = dataUrl;
    } else if (format === "svg") {
      const svg = await QRCode.toString(url, { type: "svg", margin: 1 });
      link.href = `data:image/svg+xml;base64,${btoa(svg)}`;
    } else {
      return;
    }
    link.download = `${campaign.code}.${format}`;
    link.click();
  };

  const openPrintSheet = () => {
    if (!dataUrl || !url) return;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
      <html><head><title>${campaign.name}</title></head>
      <body style="font-family:sans-serif;text-align:center;padding:48px;">
        <img src="${dataUrl}" style="width:280px;height:280px;" />
        <h2 style="margin:16px 0 4px;">${campaign.name}</h2>
        <p style="color:#666;">${url}</p>
        <script>window.onload = () => window.print();</script>
      </body></html>
    `);
    win.document.close();
  };

  const toggleStatus = async () => {
    setBusy(true);
    try {
      await qrCampaignApi.updateQrCampaign(campaign.id, { status: campaign.status === "active" ? "paused" : "active" });
      onChanged();
    } catch (err) {
      message.error(errorMessageFrom(err, "Failed to update this code"));
    } finally {
      setBusy(false);
    }
  };

  const statusLabel = campaign.isExpired ? "Expired" : campaign.status === "active" ? "Active" : "Paused";
  const statusColor = statusLabel === "Active" ? appTokens.success : appTokens.textTertiary;

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
      <div style={{ display: "flex", gap: 12 }}>
        <div
          style={{
            width: 76,
            height: 76,
            borderRadius: appTokens.radiusSm,
            border: `1px solid ${appTokens.borderLight}`,
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
          }}
        >
          {dataUrl ? <img src={dataUrl} alt={campaign.name} style={{ width: "100%", height: "100%" }} /> : null}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <Text strong style={{ fontSize: 14 }}>
            {campaign.name}
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
            {statusLabel}
          </div>
          <div>
            <Text style={{ fontSize: 12, color: appTokens.textTertiary }}>{campaign.placement || "No placement noted"}</Text>
          </div>
          <div>
            <Text style={{ fontSize: 11, color: appTokens.textTertiary }}>{url}</Text>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 16, padding: "8px 0", borderTop: `1px solid ${appTokens.borderLight}`, borderBottom: `1px solid ${appTokens.borderLight}` }}>
        <div>
          <Text style={{ fontSize: 10, color: appTokens.textTertiary, letterSpacing: 0.4 }}>SCANS</Text>
          <div>
            <Text strong style={{ fontSize: 14 }}>
              {campaign.scanCount}
            </Text>
          </div>
        </div>
        <div>
          <Text style={{ fontSize: 10, color: appTokens.textTertiary, letterSpacing: 0.4 }}>LEADS</Text>
          <div>
            <Text strong style={{ fontSize: 14, color: appTokens.primary }}>
              {campaign.leadsCount}
            </Text>
          </div>
        </div>
        <div>
          <Text style={{ fontSize: 10, color: appTokens.textTertiary, letterSpacing: 0.4 }}>CONV.</Text>
          <div>
            <Text strong style={{ fontSize: 14, color: appTokens.success }}>
              {campaign.conversionRate !== null ? `${campaign.conversionRate}%` : "—"}
            </Text>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <Button size="small" onClick={onEdit}>
          Edit
        </Button>
        <Dropdown
          menu={{
            items: [
              { key: "png", label: "Download PNG", onClick: () => download("png") },
              { key: "svg", label: "Download SVG", onClick: () => download("svg") },
            ],
          }}
          disabled={!dataUrl}
        >
          <Button size="small" disabled={!dataUrl}>
            Download PNG / SVG <DownOutlined style={{ fontSize: 10 }} />
          </Button>
        </Dropdown>
        <Button size="small" onClick={openPrintSheet} disabled={!dataUrl}>
          Print sheet
        </Button>
        <Button size="small" danger={campaign.status === "active"} loading={busy} onClick={toggleStatus}>
          {campaign.status === "active" ? "Pause" : "Activate"}
        </Button>
      </div>
    </div>
  );
}
