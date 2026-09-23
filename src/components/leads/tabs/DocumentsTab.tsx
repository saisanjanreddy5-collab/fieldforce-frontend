import { useNavigate } from "react-router-dom";
import { Button, Empty, Popconfirm, Space, Spin, Tag, Typography, Upload, message } from "antd";
import { ArrowRightOutlined, DownloadOutlined, InboxOutlined } from "@ant-design/icons";
import * as fofoOnboardingApi from "../../../api/fofo-onboarding-api";
import type { FofoHandoff, LeadDocument } from "../../../types/fofo-onboarding";
import type { Lead } from "../../../types/lead";
import { useHasPermission } from "../../../hooks/use-permission";
import { appTokens } from "../../../utils/design-system";

const { Text, Title } = Typography;

const DOC_STATUS_COLORS: Record<string, string> = {
  not_uploaded: "default",
  in_review: "gold",
  verified: "green",
  missing: "red",
};
const DOC_STATUS_LABELS: Record<string, string> = {
  not_uploaded: "Not uploaded",
  in_review: "In review",
  verified: "Verified",
  missing: "Missing",
};

interface DocumentsTabProps {
  lead: Lead;
  canView: boolean;
  loading: boolean;
  handoff: FofoHandoff | null;
  onChanged: () => void;
}

// Real lead_documents data - the same 6 real document types the FOFO
// onboarding page manages (pan_card, gst_certificate, shop_photos,
// rent_agreement, cancelled_cheque, consent_form), not an invented gate
// checklist. Upload/verify/remove reuse the exact same fofo-onboarding-api
// calls and permissions as the standalone onboarding workflow.
export function DocumentsTab({ lead, canView, loading, handoff, onChanged }: DocumentsTabProps) {
  const hasPermission = useHasPermission();
  const navigate = useNavigate();
  const canManage = hasPermission("fofo_onboarding.manage");
  const canUpload = hasPermission("fofo_onboarding.upload_document");

  if (lead.category !== "FOFO") {
    return <Empty description="Documents apply to FOFO franchise leads only" style={{ padding: 40 }} />;
  }
  if (!canView) {
    return <Empty description="You don't have permission to view this lead's documents" style={{ padding: 40 }} />;
  }
  if (loading || !handoff) {
    return (
      <div style={{ textAlign: "center", padding: 40 }}>
        <Spin />
      </div>
    );
  }

  const { documents } = handoff;

  const handleUpload = async (docType: string, file: File) => {
    try {
      await fofoOnboardingApi.uploadDocument(lead.id, docType, file);
      message.success("Document uploaded");
      onChanged();
    } catch {
      message.error("Failed to upload document");
    }
  };

  const handleDownload = async (doc: LeadDocument) => {
    try {
      await fofoOnboardingApi.downloadDocument(doc.id, doc.originalFilename ?? doc.label);
    } catch {
      message.error("Failed to download document");
    }
  };

  const handleVerify = async (doc: LeadDocument) => {
    try {
      await fofoOnboardingApi.updateDocumentStatus(doc.id, "verified");
      onChanged();
    } catch {
      message.error("Failed to update document status");
    }
  };

  const handleDelete = async (doc: LeadDocument) => {
    try {
      await fofoOnboardingApi.deleteDocument(doc.id);
      onChanged();
    } catch {
      message.error("Failed to remove document");
    }
  };

  const uploadedCount = documents.filter((d) => d.hasFile).length;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
        <div>
          <Title level={5} style={{ margin: 0 }}>
            Documents
          </Title>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {uploadedCount} of {documents.length} uploaded
          </Text>
        </div>
        <Button size="small" icon={<ArrowRightOutlined />} iconPlacement="end" onClick={() => navigate(`/fofo-onboarding/${lead.id}`)}>
          Open full onboarding workflow
        </Button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {documents.map((doc) => (
          <div
            key={doc.id}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "12px 14px",
              border: `1px solid ${appTokens.border}`,
              borderRadius: appTokens.radius,
              background: appTokens.surface,
              boxShadow: appTokens.shadowXs,
              flexWrap: "wrap",
              gap: 8,
            }}
          >
            <div>
              <Text strong style={{ fontSize: 13, display: "block" }}>
                {doc.label}
              </Text>
              {doc.hasFile && (
                <Text type="secondary" style={{ fontSize: 11 }}>
                  {doc.originalFilename}
                </Text>
              )}
            </div>
            <Space size={6}>
              <Tag color={DOC_STATUS_COLORS[doc.status]} style={{ margin: 0 }}>
                {DOC_STATUS_LABELS[doc.status]}
              </Tag>
              {doc.hasFile && <Button size="small" icon={<DownloadOutlined />} onClick={() => handleDownload(doc)} />}
              {canManage && doc.hasFile && doc.status !== "verified" && (
                <Button size="small" onClick={() => handleVerify(doc)}>
                  Verify
                </Button>
              )}
              {canManage && doc.hasFile && (
                <Popconfirm title="Remove this document?" onConfirm={() => handleDelete(doc)}>
                  <Button size="small" danger>
                    Remove
                  </Button>
                </Popconfirm>
              )}
              {canUpload && (
                <Upload
                  showUploadList={false}
                  customRequest={(options) => {
                    const file = options.file as File;
                    handleUpload(doc.docType, file).then(
                      () => options.onSuccess?.({}),
                      (err) => options.onError?.(err as Error)
                    );
                  }}
                >
                  <Button size="small" icon={<InboxOutlined />}>
                    {doc.hasFile ? "Replace" : "Upload"}
                  </Button>
                </Upload>
              )}
            </Space>
          </div>
        ))}
      </div>
    </div>
  );
}
