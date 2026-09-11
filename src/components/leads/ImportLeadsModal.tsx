import { useState } from "react";
import { App, Button, Modal, Steps, Typography, Upload } from "antd";
import { InboxOutlined } from "@ant-design/icons";
import type { UploadProps } from "antd";

const { Text, Link } = Typography;
const { Dragger } = Upload;

interface ImportLeadsModalProps {
  open: boolean;
  onClose: () => void;
}

// Skeleton UI only - no CSV/XLSX parsing or import backend exists yet.
// Column mapping and row counts shown here are illustrative, not derived
// from a real parsed file.
export function ImportLeadsModal({ open, onClose }: ImportLeadsModalProps) {
  const { message } = App.useApp();
  const [step, setStep] = useState(0);
  const [fileName, setFileName] = useState<string | null>(null);

  const reset = () => {
    setStep(0);
    setFileName(null);
  };

  const uploadProps: UploadProps = {
    multiple: false,
    showUploadList: false,
    accept: ".csv,.xlsx",
    beforeUpload: (file) => {
      setFileName(file.name);
      return false;
    },
  };

  return (
    <Modal
      title="Import leads"
      open={open}
      onCancel={() => {
        onClose();
        reset();
      }}
      footer={null}
      width={560}
    >
      <Text type="secondary">CSV or XLSX. Column mapping is remembered for next time.</Text>
      <Steps
        size="small"
        current={step}
        style={{ margin: "20px 0" }}
        items={[{ title: "Upload file" }, { title: "Map columns" }, { title: "Review & import" }]}
      />

      {step === 0 && (
        <>
          <Dragger {...uploadProps}>
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p>Drop your file here, or click to browse</p>
            <p style={{ fontSize: 12, color: "#898781" }}>CSV, XLSX up to 10MB · max 5,000 rows per import</p>
          </Dragger>
          {fileName && (
            <Text style={{ display: "block", marginTop: 12 }}>
              {fileName} · uploaded just now
            </Text>
          )}
          <Text style={{ display: "block", marginTop: 12 }}>
            Need the format?{" "}
            <Link onClick={() => message.info("Template download isn't wired up yet")}>
              Download the lead import template
            </Link>{" "}
            — it includes category, state and consent columns.
          </Text>
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
            <Button type="primary" disabled={!fileName} onClick={() => setStep(1)}>
              Continue to mapping
            </Button>
          </div>
        </>
      )}

      {step === 1 && (
        <>
          <Text type="secondary">Column mapping isn't wired up yet - this step is a UI preview.</Text>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16 }}>
            <Button onClick={() => setStep(0)}>Back</Button>
            <Button type="primary" onClick={() => setStep(2)}>
              Continue to review
            </Button>
          </div>
        </>
      )}

      {step === 2 && (
        <>
          <Text type="secondary">Duplicate detection and the actual import aren't wired up yet.</Text>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16 }}>
            <Button onClick={() => setStep(1)}>Back</Button>
            <Button
              type="primary"
              onClick={() => {
                message.info("Import isn't wired up yet");
                onClose();
                reset();
              }}
            >
              Import
            </Button>
          </div>
        </>
      )}
    </Modal>
  );
}
