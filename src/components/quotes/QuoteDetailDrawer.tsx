import { useEffect, useState } from "react";
import { App, Button, Drawer, Input, Modal, Select, Skeleton, Space, Tag, Typography } from "antd";
import { DownloadOutlined, EditOutlined, HistoryOutlined } from "@ant-design/icons";
import * as quoteApi from "../../api/quote-api";
import type { QuoteDetail, QuoteLineItemInput, QuoteStatus, QuoteVersion } from "../../types/quote";
import { useHasPermission } from "../../hooks/use-permission";
import { errorMessageFrom } from "../../utils/api-error";
import { formatDateTime } from "../../utils/lead-format";
import { appTokens } from "../../utils/design-system";
import { QUOTE_STATUS_COLORS, QUOTE_STATUS_LABELS, QUOTE_STATUS_OPTIONS } from "./quote-constants";
import { LineItemsEditor } from "./LineItemsEditor";
import { QuoteVersionView } from "./QuoteVersionView";

const { Text, Title } = Typography;

interface QuoteDetailDrawerProps {
  quoteId: string | null;
  onClose: () => void;
  onChanged?: () => void;
}

export function QuoteDetailDrawer({ quoteId, onClose, onChanged }: QuoteDetailDrawerProps) {
  const { message } = App.useApp();
  const hasPermission = useHasPermission();
  const canUpdate = hasPermission("quotes.update");

  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<QuoteDetail | null>(null);
  const [editing, setEditing] = useState(false);
  const [editLineItems, setEditLineItems] = useState<QuoteLineItemInput[]>([]);
  const [editNotes, setEditNotes] = useState("");
  const [editChangeSummary, setEditChangeSummary] = useState("");
  const [saving, setSaving] = useState(false);
  const [statusSaving, setStatusSaving] = useState(false);
  const [viewingVersion, setViewingVersion] = useState<QuoteVersion | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const load = () => {
    if (!quoteId) return;
    setLoading(true);
    quoteApi
      .getQuote(quoteId)
      .then(setDetail)
      .catch(() => message.error("Failed to load this quote"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    setEditing(false);
    setDetail(null);
    if (quoteId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quoteId]);

  const downloadPdf = async () => {
    if (!quoteId || !detail) return;
    setDownloadingPdf(true);
    try {
      await quoteApi.downloadQuotePdf(quoteId, `${detail.quote.quoteLabel}.pdf`);
    } catch (err) {
      message.error(errorMessageFrom(err, "Failed to download PDF"));
    } finally {
      setDownloadingPdf(false);
    }
  };

  const startEdit = () => {
    if (!detail) return;
    setEditLineItems(detail.currentVersion.lineItems.map(({ description, quantity, unitPrice, taxPercent }) => ({ description, quantity, unitPrice, taxPercent })));
    setEditNotes(detail.currentVersion.notes ?? "");
    setEditChangeSummary("");
    setEditing(true);
  };

  const saveEdit = async () => {
    if (!quoteId) return;
    const validItems = editLineItems.filter((i) => i.description.trim().length > 0 && i.quantity > 0);
    if (validItems.length === 0) {
      message.error("Add at least one line item");
      return;
    }
    setSaving(true);
    try {
      await quoteApi.updateQuote(quoteId, {
        lineItems: validItems,
        notes: editNotes.trim() || undefined,
        changeSummary: editChangeSummary.trim() || undefined,
      });
      message.success("New version saved");
      setEditing(false);
      load();
      onChanged?.();
    } catch (err) {
      message.error(errorMessageFrom(err, "Failed to save changes"));
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (status: QuoteStatus) => {
    if (!quoteId) return;
    setStatusSaving(true);
    try {
      await quoteApi.updateQuoteStatus(quoteId, status);
      message.success("Status updated");
      load();
      onChanged?.();
    } catch (err) {
      message.error(errorMessageFrom(err, "Failed to update status"));
    } finally {
      setStatusSaving(false);
    }
  };

  return (
    <>
      <Drawer
        title={detail ? detail.quote.quoteLabel : "Quote"}
        open={Boolean(quoteId)}
        onClose={onClose}
        size={720}
        destroyOnHidden
        styles={{ body: { background: "#fafafa" } }}
      >
        {loading || !detail ? (
          <Skeleton active paragraph={{ rows: 8 }} />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div
              style={{
                border: `1px solid ${appTokens.border}`,
                borderRadius: appTokens.radius,
                background: appTokens.surface,
                boxShadow: appTokens.shadowXs,
                padding: 16,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <Title level={4} style={{ margin: 0, color: appTokens.textPrimary }}>
                    {detail.quote.quoteLabel}
                  </Title>
                  <Text style={{ fontSize: 13, color: appTokens.textSecondary }}>
                    Version {detail.quote.currentVersion} · {formatDateTime(detail.quote.updatedAt)}
                  </Text>
                </div>
                {canUpdate ? (
                  <Select<QuoteStatus>
                    value={detail.quote.status}
                    onChange={changeStatus}
                    loading={statusSaving}
                    options={QUOTE_STATUS_OPTIONS}
                    style={{ width: 140 }}
                  />
                ) : (
                  <Tag color={QUOTE_STATUS_COLORS[detail.quote.status]} style={{ margin: 0 }}>
                    {QUOTE_STATUS_LABELS[detail.quote.status]}
                  </Tag>
                )}
              </div>

              <Space style={{ marginTop: 14 }}>
                <Button icon={<DownloadOutlined />} loading={downloadingPdf} onClick={downloadPdf}>
                  Download PDF
                </Button>
                {canUpdate && !editing && (
                  <Button icon={<EditOutlined />} onClick={startEdit}>
                    Edit quote
                  </Button>
                )}
              </Space>
            </div>

            {editing ? (
              <div
                style={{
                  border: `1px solid ${appTokens.border}`,
                  borderRadius: appTokens.radius,
                  background: appTokens.surface,
                  boxShadow: appTokens.shadowXs,
                  padding: 16,
                }}
              >
                <Text strong style={{ display: "block", marginBottom: 10, color: appTokens.textPrimary }}>
                  Editing - saving creates version {detail.quote.currentVersion + 1}
                </Text>
                <LineItemsEditor value={editLineItems} onChange={setEditLineItems} />
                <div style={{ marginTop: 14 }}>
                  <Text style={{ fontSize: 12.5, fontWeight: 600, display: "block", marginBottom: 4, color: appTokens.textSecondary }}>
                    Notes
                  </Text>
                  <Input.TextArea rows={2} value={editNotes} onChange={(e) => setEditNotes(e.target.value)} />
                </div>
                <div style={{ marginTop: 10 }}>
                  <Text style={{ fontSize: 12.5, fontWeight: 600, display: "block", marginBottom: 4, color: appTokens.textSecondary }}>
                    What changed? (optional, shown in version history)
                  </Text>
                  <Input placeholder="e.g. Reduced setup fee after negotiation" value={editChangeSummary} onChange={(e) => setEditChangeSummary(e.target.value)} />
                </div>
                <Space style={{ marginTop: 14 }}>
                  <Button onClick={() => setEditing(false)}>Cancel</Button>
                  <Button type="primary" loading={saving} onClick={saveEdit}>
                    Save as new version
                  </Button>
                </Space>
              </div>
            ) : (
              <div
                style={{
                  border: `1px solid ${appTokens.border}`,
                  borderRadius: appTokens.radius,
                  background: appTokens.surface,
                  boxShadow: appTokens.shadowXs,
                  padding: 16,
                }}
              >
                <QuoteVersionView version={detail.currentVersion} />
              </div>
            )}

            <div
              style={{
                border: `1px solid ${appTokens.border}`,
                borderRadius: appTokens.radius,
                background: appTokens.surface,
                boxShadow: appTokens.shadowXs,
                overflow: "hidden",
              }}
            >
              <div style={{ padding: "12px 16px", borderBottom: `1px solid ${appTokens.borderLight}`, display: "flex", alignItems: "center", gap: 8 }}>
                <HistoryOutlined style={{ color: appTokens.textTertiary }} />
                <Text strong style={{ fontSize: 13.5, color: appTokens.textPrimary }}>
                  Version history
                </Text>
              </div>
              {detail.versions.map((v) => (
                <div
                  key={v.id}
                  onClick={() => setViewingVersion(v)}
                  style={{
                    padding: "10px 16px",
                    borderBottom: `1px solid ${appTokens.borderLight}`,
                    cursor: "pointer",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <Text strong style={{ fontSize: 13, color: appTokens.textPrimary }}>
                      Version {v.versionNumber}
                      {v.versionNumber === detail.quote.currentVersion && (
                        <Tag color={appTokens.primary} style={{ marginLeft: 8, fontSize: 10 }}>
                          Current
                        </Tag>
                      )}
                    </Text>
                    <div>
                      <Text style={{ fontSize: 12, color: appTokens.textTertiary }}>
                        {v.changeSummary || "No summary"} · {v.createdByName ?? "Unknown"} · {formatDateTime(v.createdAt)}
                      </Text>
                    </div>
                  </div>
                  <Text strong style={{ fontSize: 13, color: appTokens.textPrimary, flexShrink: 0 }}>
                    {new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(v.grandTotal)}
                  </Text>
                </div>
              ))}
            </div>
          </div>
        )}
      </Drawer>

      <Modal
        title={viewingVersion ? `${detail?.quote.quoteLabel ?? ""} · Version ${viewingVersion.versionNumber}` : ""}
        open={Boolean(viewingVersion)}
        onCancel={() => setViewingVersion(null)}
        footer={<Button onClick={() => setViewingVersion(null)}>Close</Button>}
        width={640}
        // This Modal always opens from inside this component's own Drawer,
        // and both default to the same z-index (1000) - with no
        // deliberate layering, the browser falls back to paint order, so
        // the Drawer's opaque content wrapper could render on top of this
        // Modal instead of under it. A higher explicit z-index guarantees
        // it always wins over its parent Drawer.
        zIndex={1050}
      >
        {viewingVersion && <QuoteVersionView version={viewingVersion} />}
      </Modal>
    </>
  );
}
