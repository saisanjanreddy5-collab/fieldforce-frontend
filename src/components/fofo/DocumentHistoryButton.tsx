import { useEffect, useState } from "react";
import { App, Button, Empty, Modal, Popconfirm, Spin, Tag, Typography } from "antd";
import { DownloadOutlined, HistoryOutlined } from "@ant-design/icons";
import * as fofoOnboardingApi from "../../api/fofo-onboarding-api";
import type { DocumentArchiveEntry } from "../../types/fofo-onboarding";
import { useHasPermission } from "../../hooks/use-permission";
import { appTokens } from "../../utils/design-system";
import { formatDateTime } from "../../utils/lead-format";

const { Text } = Typography;

interface DocumentHistoryButtonProps {
  leadId: string;
  docType: string;
  docLabel: string;
  // Called after a restore so the parent re-fetches the handoff/document
  // list and shows the newly-live file.
  onRestored: () => void;
}

// Shared by DocumentsTab.tsx (Lead detail) and FofoHandoffDetail.tsx (the
// standalone onboarding workflow) - both manage the exact same
// lead_documents/lead_document_archive data, just in two different places in
// the UI, so this lives once rather than being built twice. Every past
// version of this one document slot (replaced on re-upload, or explicitly
// removed) is logged in lead_document_archive and was previously
// unreachable from anywhere in the app - this is the "where did it go, and
// can I get it back" view for that log.
export function DocumentHistoryButton({ leadId, docType, docLabel, onRestored }: DocumentHistoryButtonProps) {
  const { message } = App.useApp();
  const hasPermission = useHasPermission();
  const canRestore = hasPermission("fofo_onboarding.upload_document");
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState<DocumentArchiveEntry[] | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setEntries(null);
    fofoOnboardingApi
      .listDocumentHistory(leadId, docType)
      .then(setEntries)
      .catch(() => {
        message.error("Failed to load document history");
        setEntries([]);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleDownload = async (entry: DocumentArchiveEntry) => {
    try {
      await fofoOnboardingApi.downloadArchivedDocument(entry.id, entry.originalFilename ?? entry.label);
    } catch {
      message.error("Failed to download this version");
    }
  };

  const handleRestore = async (entry: DocumentArchiveEntry) => {
    setRestoringId(entry.id);
    try {
      await fofoOnboardingApi.restoreArchivedDocument(entry.id);
      message.success("Document restored");
      setOpen(false);
      onRestored();
    } catch {
      message.error("Failed to restore this version");
    } finally {
      setRestoringId(null);
    }
  };

  return (
    <>
      <Button size="small" icon={<HistoryOutlined />} onClick={() => setOpen(true)} title="History" />
      <Modal title={`${docLabel} – history`} open={open} onCancel={() => setOpen(false)} footer={null} width={520}>
        {entries === null ? (
          <div style={{ textAlign: "center", padding: 24 }}>
            <Spin />
          </div>
        ) : entries.length === 0 ? (
          <Empty description="No earlier versions of this document" style={{ padding: 16 }} />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {entries.map((entry) => (
              <div
                key={entry.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "10px 12px",
                  border: `1px solid ${appTokens.border}`,
                  borderRadius: appTokens.radiusSm,
                  gap: 10,
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <Text strong style={{ display: "block", fontSize: 13 }}>
                    {entry.originalFilename ?? "Untitled file"}
                  </Text>
                  <Text style={{ fontSize: 11.5, color: appTokens.textTertiary }}>
                    {entry.archivedReason === "deleted" ? "Removed" : "Replaced"} {formatDateTime(entry.archivedAt)}
                  </Text>
                </div>
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  <Tag style={{ margin: 0 }}>{entry.archivedReason === "deleted" ? "Removed" : "Replaced"}</Tag>
                  <Button size="small" icon={<DownloadOutlined />} onClick={() => handleDownload(entry)} />
                  {canRestore && (
                    <Popconfirm title="Restore this version?" description="It becomes the live document again." onConfirm={() => handleRestore(entry)}>
                      <Button size="small" type="primary" loading={restoringId === entry.id}>
                        Restore
                      </Button>
                    </Popconfirm>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </>
  );
}
