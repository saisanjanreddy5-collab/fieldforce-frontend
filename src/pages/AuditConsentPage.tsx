import { useEffect, useState } from "react";
import { Button, Tag, Typography, message } from "antd";
import dayjs from "dayjs";
import * as auditConsentApi from "../api/audit-consent-api";
import type { AuditEvent, ConsentBucket } from "../types/audit-consent";
import { useHasPermission } from "../hooks/use-permission";
import { exportToXlsx } from "../utils/export-xlsx";
import { appTokens } from "../utils/design-system";

const { Title, Text } = Typography;

const ACTION_TAG: Record<string, { label: string; color: string }> = {
  category_changed: { label: "CAT", color: appTokens.primary },
  owner_reassigned: { label: "OWN", color: appTokens.purple },
  status_changed: { label: "STG", color: appTokens.warning },
  approval_decided: { label: "APR", color: appTokens.success },
  consent_granted: { label: "CON", color: appTokens.success },
  deleted: { label: "DEL", color: appTokens.danger },
  assignment_rule_edited: { label: "RUL", color: appTokens.textSecondary },
};

const STATUS_LABEL: Record<string, string> = { granted: "Granted", pending: "Pending", mixed: "Mixed", no_data: "No data" };
const STATUS_COLOR: Record<string, string> = {
  granted: appTokens.success,
  pending: appTokens.warning,
  mixed: appTokens.primary,
  no_data: appTokens.textTertiary,
};

export default function AuditConsentPage() {
  const hasPermission = useHasPermission();
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [buckets, setBuckets] = useState<ConsentBucket[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    Promise.all([auditConsentApi.listAuditLog(), auditConsentApi.getConsentRegister()])
      .then(([e, b]) => {
        setEvents(e.events);
        setBuckets(b);
      })
      .catch(() => message.error("Failed to load audit trail"))
      .finally(() => setLoading(false));
  }, []);

  const handleExport = async () => {
    setExporting(true);
    try {
      // An export means every record, not one page - the endpoint now
      // paginates, so walk every page until there's nothing left rather
      // than silently truncating what used to be an unbounded query.
      const records = [];
      let page = 1;
      for (;;) {
        const res = await auditConsentApi.listConsentRecords(page);
        records.push(...res.records);
        if (records.length >= res.total || res.records.length === 0) break;
        page += 1;
      }
      await exportToXlsx(
        "Consent proof",
        [
          { header: "Lead", key: "leadName" },
          { header: "Lead #", key: "leadNumber" },
          { header: "Purpose bucket", key: "purposeBucket" },
          { header: "Purpose (as recorded)", key: "purposesRaw", width: 32 },
          { header: "Method", key: "method" },
          { header: "Status", key: "status" },
          { header: "Captured at", key: "capturedAt" },
        ],
        records.map((r) => ({ ...r, capturedAt: r.capturedAt ? dayjs(r.capturedAt).format("YYYY-MM-DD HH:mm") : "-" })),
        "consent-proof"
      );
    } catch {
      message.error("Failed to export consent proof");
    } finally {
      setExporting(false);
    }
  };

  if (!hasPermission("audit_log.view")) {
    return (
      <div>
        <Title level={3}>Audit &amp; consent</Title>
        <Text type="secondary">You do not have permission to view the audit trail.</Text>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <Title level={3} style={{ margin: 0, letterSpacing: -0.3, color: appTokens.textPrimary }}>
          Audit trail &amp; consent register
        </Title>
        <Text style={{ color: appTokens.textSecondary, fontSize: 13.5 }}>
          Real changes to a lead's category, owner or stage, approval decisions and assignment rule edits - each with the actor, timestamp
          and IP address.
        </Text>
      </div>

      <div style={{ display: "flex", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
        <div
          style={{
            flex: 2,
            minWidth: 380,
            border: `1px solid ${appTokens.border}`,
            borderRadius: appTokens.radius,
            background: appTokens.surface,
            boxShadow: appTokens.shadowSm,
            overflow: "hidden",
          }}
        >
          <div style={{ padding: "14px 18px", borderBottom: `1px solid ${appTokens.borderLight}`, display: "flex", justifyContent: "space-between" }}>
            <Text strong style={{ fontSize: 14 }}>
              Change log
            </Text>
            <Text style={{ fontSize: 12, color: appTokens.textTertiary }}>{events.length} recorded</Text>
          </div>

          {!loading && events.length === 0 && (
            <div style={{ padding: "40px 18px", textAlign: "center" }}>
              <Text style={{ fontSize: 13, color: appTokens.textTertiary }}>
                No changes recorded yet - this fills in as leads, approvals and assignment rules are actually edited.
              </Text>
            </div>
          )}

          {events.map((e, idx) => {
            const tag = ACTION_TAG[e.action] ?? { label: "EVT", color: appTokens.textTertiary };
            return (
              <div
                key={e.id}
                style={{
                  display: "flex",
                  gap: 14,
                  padding: "14px 18px",
                  borderBottom: idx === events.length - 1 ? "none" : `1px solid ${appTokens.borderLight}`,
                }}
              >
                <div
                  style={{
                    width: 34,
                    height: 24,
                    flexShrink: 0,
                    borderRadius: 6,
                    background: `${tag.color}17`,
                    color: tag.color,
                    fontSize: 10.5,
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {tag.label}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Text strong style={{ fontSize: 13.5 }}>
                    {e.summary}
                  </Text>
                  {(e.oldValue || e.newValue) && (
                    <div>
                      <Text style={{ fontSize: 12.5, color: appTokens.textSecondary }}>
                        {e.oldValue ?? "—"} → {e.newValue ?? "—"}
                      </Text>
                    </div>
                  )}
                  <div>
                    <Text style={{ fontSize: 11.5, color: appTokens.textTertiary }}>
                      {e.actorName ?? "System"} · {dayjs(e.createdAt).format("D MMM YYYY, HH:mm")} IST
                      {e.ipAddress ? ` · ${e.ipAddress}` : ""}
                    </Text>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ flex: 1, minWidth: 320, display: "flex", flexDirection: "column", gap: 16 }}>
          <div
            style={{
              border: `1px solid ${appTokens.border}`,
              borderRadius: appTokens.radius,
              background: appTokens.surface,
              boxShadow: appTokens.shadowSm,
              overflow: "hidden",
            }}
          >
            <div style={{ padding: "14px 18px", borderBottom: `1px solid ${appTokens.borderLight}` }}>
              <Text strong style={{ fontSize: 14 }}>
                DPDP consent register
              </Text>
              <div>
                <Text style={{ fontSize: 12, color: appTokens.textTertiary }}>
                  Grouped from real consent records by purpose. "Granted"/"Pending" reflect the only two states FieldForce actually
                  records today.
                </Text>
              </div>
            </div>

            {buckets.map((b, idx) => (
              <div
                key={b.key}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 18px",
                  borderBottom: idx === buckets.length - 1 ? "none" : `1px solid ${appTokens.borderLight}`,
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Text strong style={{ fontSize: 13 }}>
                    {b.label}
                  </Text>
                  <div>
                    <Text style={{ fontSize: 11.5, color: appTokens.textTertiary }}>
                      {b.total === 0 ? "No consent records yet" : `${b.granted} granted · ${b.pending} pending`}
                    </Text>
                  </div>
                </div>
                <Tag
                  style={{
                    margin: 0,
                    width: 80,
                    textAlign: "center",
                    fontWeight: 600,
                    border: "none",
                    color: STATUS_COLOR[b.status],
                    background: `${STATUS_COLOR[b.status]}17`,
                    flexShrink: 0,
                  }}
                >
                  {STATUS_LABEL[b.status]}
                </Tag>
              </div>
            ))}

            {hasPermission("audit_log.export") && (
              <div style={{ padding: "14px 18px" }}>
                <Button block loading={exporting} onClick={handleExport}>
                  Export consent proof
                </Button>
              </div>
            )}
          </div>

          <div
            style={{
              border: `1px solid ${appTokens.border}`,
              borderRadius: appTokens.radius,
              background: appTokens.surfaceMuted,
              padding: 16,
            }}
          >
            <Text strong style={{ fontSize: 13 }}>
              Data subject requests
            </Text>
            <div>
              <Text style={{ fontSize: 12, color: appTokens.textTertiary }}>
                Not built yet - tracking DPDP access, erasure and consent-withdrawal requests needs its own table and workflow, separate
                from this change log.
              </Text>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
