import { useEffect, useState } from "react";
import { Button, Typography, message } from "antd";
import * as qrCampaignApi from "../../api/qr-campaign-api";
import * as websiteLeadSourceApi from "../../api/website-lead-source-api";
import type { QrCampaign, QrCampaignSummary } from "../../types/qr-campaign";
import type { WebsiteLeadSource } from "../../types/website-lead-source";
import { appTokens } from "../../utils/design-system";
import { QrCampaignCard } from "./QrCampaignCard";
import { GenerateQrCampaignModal } from "./GenerateQrCampaignModal";
import { WebsiteLeadSourceCard } from "./WebsiteLeadSourceCard";
import { AddWebsiteLeadSourceModal } from "./AddWebsiteLeadSourceModal";

const { Text } = Typography;

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div
      style={{
        flex: 1,
        minWidth: 150,
        border: `1px solid ${appTokens.border}`,
        borderRadius: appTokens.radius,
        background: appTokens.surface,
        boxShadow: appTokens.shadowSm,
        padding: "14px 16px",
      }}
    >
      <Text style={{ fontSize: 11.5, color: appTokens.textTertiary }}>{label}</Text>
      <div style={{ fontSize: 22, fontWeight: 700, color: appTokens.textPrimary, lineHeight: 1.3 }}>{value}</div>
      {sub && (
        <Text style={{ fontSize: 11.5, color: appTokens.textTertiary }}>
          {sub}
        </Text>
      )}
    </div>
  );
}

export function QrLeadCaptureTab() {
  const [campaigns, setCampaigns] = useState<QrCampaign[]>([]);
  const [summary, setSummary] = useState<QrCampaignSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<QrCampaign | null>(null);
  const [creating, setCreating] = useState(false);

  const [websiteSources, setWebsiteSources] = useState<WebsiteLeadSource[]>([]);
  const [websiteLoading, setWebsiteLoading] = useState(true);
  const [editingSource, setEditingSource] = useState<WebsiteLeadSource | null>(null);
  const [creatingSource, setCreatingSource] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([qrCampaignApi.listQrCampaigns(), qrCampaignApi.getQrCampaignSummary()])
      .then(([campaignsRes, summaryRes]) => {
        setCampaigns(campaignsRes);
        setSummary(summaryRes);
      })
      .catch(() => message.error("Failed to load QR lead capture data"))
      .finally(() => setLoading(false));
  };

  const loadWebsiteSources = () => {
    setWebsiteLoading(true);
    websiteLeadSourceApi
      .listWebsiteLeadSources()
      .then(setWebsiteSources)
      .catch(() => message.error("Failed to load website lead sources"))
      .finally(() => setWebsiteLoading(false));
  };

  useEffect(load, []);
  useEffect(loadWebsiteSources, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <StatCard
          label="Active QR codes"
          value={summary ? `${summary.activeCount} of ${summary.totalCount}` : "—"}
        />
        <StatCard label="Total scans" value={summary ? String(summary.totalScans) : "—"} />
        <StatCard
          label="Leads captured"
          value={summary ? String(summary.leadsCount) : "—"}
          sub={summary?.conversionRate !== null && summary?.conversionRate !== undefined ? `${summary.conversionRate}% of scans` : undefined}
        />
        <StatCard
          label="Consent captured at submission"
          value={summary?.consentRate !== null && summary?.consentRate !== undefined ? `${summary.consentRate}%` : "—"}
          sub="DPDP checkbox, real"
        />
      </div>

      <div
        style={{
          border: `1px solid ${appTokens.border}`,
          borderRadius: appTokens.radius,
          background: appTokens.surface,
          boxShadow: appTokens.shadowSm,
        }}
      >
        <div style={{ padding: "14px 18px", borderBottom: `1px solid ${appTokens.borderLight}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <Text strong style={{ fontSize: 14 }}>
              QR codes
            </Text>
            <div>
              <Text style={{ fontSize: 12.5, color: appTokens.textTertiary }}>
                Each code is a real, scannable link to a public capture form. Submissions create a real lead, run assignment rules and record consent.
              </Text>
            </div>
          </div>
          <Button type="primary" onClick={() => setCreating(true)}>
            + Generate QR code
          </Button>
        </div>

        {!loading && campaigns.length === 0 && (
          <div style={{ padding: "40px 18px", textAlign: "center" }}>
            <Text style={{ color: appTokens.textTertiary, fontSize: 13 }}>No QR codes yet - generate one to start capturing leads from print, decals or standees.</Text>
          </div>
        )}

        {campaigns.length > 0 && (
          <div style={{ padding: 16, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 14 }}>
            {campaigns.map((c) => (
              <QrCampaignCard key={c.id} campaign={c} onEdit={() => setEditing(c)} onChanged={load} />
            ))}
          </div>
        )}
      </div>

      <div
        style={{
          border: `1px solid ${appTokens.border}`,
          borderRadius: appTokens.radius,
          background: appTokens.surface,
          boxShadow: appTokens.shadowSm,
        }}
      >
        <div style={{ padding: "14px 18px", borderBottom: `1px solid ${appTokens.borderLight}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <Text strong style={{ fontSize: 14 }}>
              Website lead sources
            </Text>
            <div>
              <Text style={{ fontSize: 12.5, color: appTokens.textTertiary }}>
                For a client's own website - when their ad-campaign landing page or contact form is submitted, it calls the endpoint
                below directly and a real lead is created here automatically. No Meta/social API involved; their developer just needs
                to add the call to their form.
              </Text>
            </div>
          </div>
          <Button type="primary" onClick={() => setCreatingSource(true)}>
            + Add website source
          </Button>
        </div>

        {!websiteLoading && websiteSources.length === 0 && (
          <div style={{ padding: "40px 18px", textAlign: "center" }}>
            <Text style={{ color: appTokens.textTertiary, fontSize: 13 }}>
              No website sources yet - add one to get a submission link for a client's website form.
            </Text>
          </div>
        )}

        {websiteSources.length > 0 && (
          <div style={{ padding: 16, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 14 }}>
            {websiteSources.map((s) => (
              <WebsiteLeadSourceCard key={s.id} source={s} onEdit={() => setEditingSource(s)} onChanged={loadWebsiteSources} />
            ))}
          </div>
        )}
      </div>

      <AddWebsiteLeadSourceModal
        open={editingSource !== null || creatingSource}
        onClose={() => {
          setEditingSource(null);
          setCreatingSource(false);
        }}
        source={editingSource}
        onSaved={() => {
          setEditingSource(null);
          setCreatingSource(false);
          loadWebsiteSources();
        }}
      />

      <GenerateQrCampaignModal
        open={editing !== null || creating}
        onClose={() => {
          setEditing(null);
          setCreating(false);
        }}
        campaign={editing}
        onSaved={() => {
          setEditing(null);
          setCreating(false);
          load();
        }}
      />
    </div>
  );
}
