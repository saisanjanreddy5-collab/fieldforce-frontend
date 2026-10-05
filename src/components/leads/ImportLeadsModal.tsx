import { useEffect, useState } from "react";
import { App, Button, Modal, Select, Spin, Steps, Typography, Upload } from "antd";
import { InboxOutlined } from "@ant-design/icons";
import type { UploadProps } from "antd";
import * as leadApi from "../../api/lead-api";
import type { BulkImportResult } from "../../api/lead-api";
import { parseImportFile, type ParsedImportFile } from "../../utils/parse-import-file";
import { IMPORT_MAPPABLE_FIELDS, resolveInitialMapping, saveMapping, type ColumnMapping } from "../../utils/lead-import-mapping";
import { exportToXlsx } from "../../utils/export-xlsx";

const { Text, Link } = Typography;
const { Dragger } = Upload;

interface ImportLeadsModalProps {
  open: boolean;
  onClose: () => void;
  onImported: () => void;
}

// Fully real end to end: client-side parsing (CSV/XLSX), column mapping
// (remembered per-field in localStorage), and the actual bulk import
// against POST /leads/bulk-import, which reuses createLead's own
// duplicate-phone detection per row plus a within-file duplicate guard.
export function ImportLeadsModal({ open, onClose, onImported }: ImportLeadsModalProps) {
  const { message } = App.useApp();
  const [step, setStep] = useState(0);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ParsedImportFile | null>(null);
  const [parsing, setParsing] = useState(false);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<BulkImportResult | null>(null);

  const reset = () => {
    setStep(0);
    setFileName(null);
    setParsed(null);
    setParsing(false);
    setMapping({});
    setImporting(false);
    setResult(null);
  };

  // Re-derived whenever a new file finishes parsing - starts from the
  // mapping remembered from last time (per field, only where this file
  // actually has a header with that same name), filling in anything else
  // with a conservative exact-match guess.
  useEffect(() => {
    if (parsed) setMapping(resolveInitialMapping(parsed.headers));
  }, [parsed]);

  const updateMapping = (fieldKey: string, header: string | undefined) => {
    setMapping((prev) => {
      const next = { ...prev };
      if (header) next[fieldKey] = header;
      else delete next[fieldKey];
      saveMapping(next);
      return next;
    });
  };

  const canContinueMapping = Boolean(mapping.fullName);

  // One record per data row, keyed by our field names (not the file's
  // header names) - pulls each cell by looking up the mapped header's
  // column index, same lookup for every row.
  const buildRows = (): Record<string, unknown>[] => {
    if (!parsed) return [];
    const columnIndex: Record<string, number> = {};
    for (const field of IMPORT_MAPPABLE_FIELDS) {
      const header = mapping[field.key];
      if (header) columnIndex[field.key] = parsed.headers.indexOf(header);
    }
    return parsed.rows.map((row) => {
      const record: Record<string, unknown> = {};
      for (const field of IMPORT_MAPPABLE_FIELDS) {
        const index = columnIndex[field.key];
        if (index === undefined) continue;
        const value = row[index]?.trim();
        if (value) record[field.key] = value;
      }
      return record;
    });
  };

  const handleImport = async () => {
    setImporting(true);
    try {
      const rows = buildRows();
      const importResult = await leadApi.bulkImportLeads(rows);
      setResult(importResult);
      if (importResult.created > 0) onImported();
    } catch (err) {
      message.error(err instanceof Error ? err.message : "Import failed");
    } finally {
      setImporting(false);
    }
  };

  const handleDownloadTemplate = () => {
    exportToXlsx(
      "Leads",
      IMPORT_MAPPABLE_FIELDS.map((f) => ({ header: f.label, key: f.key })),
      [],
      "lead-import-template"
    );
  };

  const uploadProps: UploadProps = {
    multiple: false,
    showUploadList: false,
    accept: ".csv,.xlsx",
    beforeUpload: (file) => {
      setFileName(file.name);
      setParsed(null);
      setParsing(true);
      parseImportFile(file)
        .then(setParsed)
        .catch((err) => {
          setFileName(null);
          message.error(err instanceof Error ? err.message : "Couldn't read that file");
        })
        .finally(() => setParsing(false));
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
          {parsing && (
            <Text style={{ display: "block", marginTop: 12 }}>
              <Spin size="small" style={{ marginRight: 8 }} />
              Reading {fileName}...
            </Text>
          )}
          {parsed && fileName && !parsing && (
            <Text style={{ display: "block", marginTop: 12 }}>
              {fileName} · {parsed.rows.length} row{parsed.rows.length === 1 ? "" : "s"} · {parsed.headers.length} column
              {parsed.headers.length === 1 ? "" : "s"} detected
            </Text>
          )}
          <Text style={{ display: "block", marginTop: 12 }}>
            Need the format?{" "}
            <Link onClick={handleDownloadTemplate}>Download the lead import template</Link>
          </Text>
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
            <Button type="primary" disabled={!parsed} onClick={() => setStep(1)}>
              Continue to mapping
            </Button>
          </div>
        </>
      )}

      {step === 1 && parsed && (
        <>
          <Text type="secondary">
            Match each field to a column from your file. Your choices are remembered for next time.
          </Text>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 16, maxHeight: 360, overflowY: "auto" }}>
            {IMPORT_MAPPABLE_FIELDS.map((field) => (
              <div key={field.key} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <Text style={{ width: 150, flexShrink: 0 }}>
                  {field.label}
                  {field.required && <Text type="danger"> *</Text>}
                </Text>
                <Select
                  style={{ flex: 1 }}
                  allowClear={!field.required}
                  placeholder="Not mapped"
                  value={mapping[field.key]}
                  onChange={(value) => updateMapping(field.key, value)}
                  options={parsed.headers.map((h) => ({ value: h, label: h }))}
                />
              </div>
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16 }}>
            <Button onClick={() => setStep(0)}>Back</Button>
            <Button type="primary" disabled={!canContinueMapping} onClick={() => setStep(2)}>
              Continue to review
            </Button>
          </div>
        </>
      )}

      {step === 2 && parsed && !result && (
        <>
          <Text type="secondary">
            Ready to import {parsed.rows.length} lead{parsed.rows.length === 1 ? "" : "s"}. A duplicate phone number
            (already an active lead, or repeated within this file) is skipped, not overwritten.
          </Text>
          <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 4 }}>
            {IMPORT_MAPPABLE_FIELDS.filter((f) => mapping[f.key]).map((f) => (
              <Text key={f.key} style={{ fontSize: 13 }}>
                <Text strong>{f.label}</Text> ← {mapping[f.key]}
              </Text>
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16 }}>
            <Button onClick={() => setStep(1)} disabled={importing}>
              Back
            </Button>
            <Button type="primary" loading={importing} onClick={handleImport}>
              Import {parsed.rows.length} lead{parsed.rows.length === 1 ? "" : "s"}
            </Button>
          </div>
        </>
      )}

      {step === 2 && result && (
        <>
          <Text strong style={{ display: "block", color: "#15803d" }}>
            {result.created} lead{result.created === 1 ? "" : "s"} created
          </Text>
          {result.skipped.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <Text type="secondary">{result.skipped.length} skipped as duplicates:</Text>
              <div style={{ maxHeight: 140, overflowY: "auto", marginTop: 4 }}>
                {result.skipped.map((s, i) => (
                  <Text key={i} style={{ display: "block", fontSize: 12.5 }}>
                    Row {s.row}: {s.reason}
                  </Text>
                ))}
              </div>
            </div>
          )}
          {result.errors.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <Text type="danger">{result.errors.length} row{result.errors.length === 1 ? "" : "s"} couldn't be imported:</Text>
              <div style={{ maxHeight: 140, overflowY: "auto", marginTop: 4 }}>
                {result.errors.map((e, i) => (
                  <Text key={i} type="danger" style={{ display: "block", fontSize: 12.5 }}>
                    Row {e.row}: {e.message}
                  </Text>
                ))}
              </div>
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
            <Button
              type="primary"
              onClick={() => {
                onClose();
                reset();
              }}
            >
              Done
            </Button>
          </div>
        </>
      )}
    </Modal>
  );
}
