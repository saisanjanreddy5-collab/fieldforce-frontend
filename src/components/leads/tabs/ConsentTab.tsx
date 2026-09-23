import { useEffect, useState } from "react";
import { Empty, Spin, Tag, Typography, message } from "antd";
import { CheckCircleFilled, SafetyCertificateOutlined } from "@ant-design/icons";
import * as leadApi from "../../../api/lead-api";
import type { LeadConsent } from "../../../types/lead";
import { formatDateTime } from "../../../utils/lead-format";

const { Text } = Typography;

interface ConsentTabProps {
  leadId: string;
  /** Pass pre-fetched consent (including explicit null) to skip the internal
   * fetch - used by OverviewTab, which already loads this once to compute
   * the synopsis count, so this avoids fetching the same record twice.
   * Omit entirely (undefined) to self-fetch, as LeadDetail's standalone
   * Consent tab and LeadFormDrawer's edit-mode Consent tab both do. */
  consent?: LeadConsent | null;
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <Text type="secondary" style={{ fontSize: 11, display: "block", marginBottom: 4 }}>
        {label}
      </Text>
      <Text style={{ fontSize: 13 }}>{value}</Text>
    </div>
  );
}

export function ConsentTab({ leadId, consent: consentProp }: ConsentTabProps) {
  const [fetchedConsent, setFetchedConsent] = useState<LeadConsent | null>(null);
  const [loading, setLoading] = useState(consentProp === undefined);
  const consent = consentProp !== undefined ? consentProp : fetchedConsent;

  useEffect(() => {
    if (consentProp !== undefined) return;
    setLoading(true);
    leadApi
      .getLeadConsent(leadId)
      .then(setFetchedConsent)
      .catch(() => message.error("Failed to load consent"))
      .finally(() => setLoading(false));
  }, [leadId, consentProp]);

  if (loading) return <Spin />;

  if (!consent || !consent.captured) {
    return <Empty description="No DPDP consent captured yet for this lead" style={{ padding: 24 }} />;
  }

  return (
    <div style={{ maxWidth: 640 }}>
      <div style={{ border: "1px solid #b7eb8f", borderRadius: 10, overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "14px 16px", background: "#f6ffed" }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 7,
              background: "#389e0d",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              fontSize: 14,
              marginTop: 1,
            }}
          >
            <SafetyCertificateOutlined />
          </div>
          <div>
            <Text strong style={{ fontSize: 14, display: "block", color: "#237804" }}>
              <CheckCircleFilled style={{ marginRight: 6 }} />
              DPDP consent — captured
            </Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {consent.method ? `Granted via ${consent.method}` : "Consent granted"}
              {consent.capturedAt ? ` · ${formatDateTime(consent.capturedAt)}` : ""}
            </Text>
          </div>
        </div>
        <div style={{ padding: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, background: "#fff" }}>
          <Field label="Purposes" value={consent.purposes ?? "-"} />
          <Field label="Status" value={consent.status} />
          <Field label="Consent evidence" value={consent.evidenceRef ?? "-"} />
          <Field label="Notes" value={consent.notes || "-"} />
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        <Tag color="success" icon={<CheckCircleFilled />} style={{ padding: "4px 10px" }}>
          Consent covers: {consent.purposes ?? "not specified"}
        </Tag>
      </div>
    </div>
  );
}
