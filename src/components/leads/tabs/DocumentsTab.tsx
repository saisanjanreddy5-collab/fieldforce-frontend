import { useState } from "react";
import { Alert, Tag, Typography, Upload, message } from "antd";
import { InboxOutlined } from "@ant-design/icons";
import type { UploadProps } from "antd";
import { useAuth } from "../../../context/AuthContext";
import { formatDate } from "../../../utils/lead-format";

const { Text } = Typography;
const { Dragger } = Upload;

// Skeleton UI only - there's no file-storage backend yet, so files added
// here live in local component state and are lost on refresh. Built to the
// same shape (name/size/uploader/date/status) a real Documents API would
// return, so swapping in real persistence later is a data-source change,
// not a redesign.
type VerificationStatus = "Verified" | "In review" | "Missing sign";

interface DocumentEntry {
  id: string;
  name: string;
  sizeLabel: string;
  uploadedBy: string;
  uploadedAt: string;
  status: VerificationStatus;
}

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function statusColor(status: VerificationStatus): string {
  if (status === "Verified") return "success";
  if (status === "In review") return "processing";
  return "error";
}

export function DocumentsTab() {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<DocumentEntry[]>([]);

  const uploadProps: UploadProps = {
    multiple: true,
    showUploadList: false,
    beforeUpload: (file) => {
      setDocuments((prev) => [
        {
          id: `${file.uid}`,
          name: file.name,
          sizeLabel: formatSize(file.size),
          uploadedBy: user?.name ?? "You",
          uploadedAt: new Date().toISOString(),
          status: "In review",
        },
        ...prev,
      ]);
      message.success(`${file.name} added (not persisted - no storage backend yet)`);
      return false;
    },
  };

  return (
    <div>
      <Alert
        type="warning"
        showIcon
        style={{ marginBottom: 16 }}
        title="This is a UI preview - files are not actually stored yet"
        description="No file-storage backend is connected. Files you add here only exist in this browser tab and disappear on refresh."
      />

      <Dragger {...uploadProps} style={{ marginBottom: 16 }}>
        <p className="ant-upload-drag-icon">
          <InboxOutlined />
        </p>
        <p>Drop files or images here, or click to browse</p>
        <p style={{ fontSize: 12, color: "#898781" }}>
          PAN, GST, Aadhaar, shop photos, rent agreement — linked to the lead and carried to the customer record
        </p>
      </Dragger>

      {documents.length === 0 ? (
        <Text type="secondary">No documents added yet</Text>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {documents.map((doc) => (
            <div
              key={doc.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "10px 12px",
                border: "1px solid #f0f0f0",
                borderRadius: 8,
                flexWrap: "wrap",
                gap: 8,
              }}
            >
              <div>
                <Text strong>{doc.name}</Text>
                <div>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {doc.sizeLabel} · uploaded by {doc.uploadedBy} · {formatDate(doc.uploadedAt)}
                  </Text>
                </div>
              </div>
              <Tag color={statusColor(doc.status)}>{doc.status}</Tag>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
