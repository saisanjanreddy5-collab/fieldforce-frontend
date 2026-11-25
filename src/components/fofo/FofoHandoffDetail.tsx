import { useEffect, useState } from "react";
import { emailRules, normalizeEmail } from "../../utils/email-typo-check";
import {
  Avatar,
  Button,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Popconfirm,
  Select,
  Space,
  Spin,
  Steps,
  Tag,
  Tooltip,
  Typography,
  Upload,
  message,
} from "antd";
import { CheckCircleFilled, DownloadOutlined, ExclamationCircleFilled, InboxOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import * as fofoApi from "../../api/fofo-onboarding-api";
import * as leadApi from "../../api/lead-api";
import type { FofoHandoff, LeadDocument } from "../../types/fofo-onboarding";
import type { LeadConsent } from "../../types/lead";
import { useHasPermission } from "../../hooks/use-permission";
import { formatDate, initials } from "../../utils/lead-format";
import { appTokens, avatarGradient } from "../../utils/design-system";
import { DocumentHistoryButton } from "./DocumentHistoryButton";
import { errorMessageFrom } from "../../utils/api-error";

const { Text, Title } = Typography;

// Every step is optional (client decision 2026-11-25) - the field person can
// push an interested client straight away with just the lead's own details,
// and fill these in whenever they have them.
const STEP_LABELS = ["Applicant", "Store information", "Documents & KYC", "Commercials", "Go-live & push"];

const DOC_STATUS_COLORS: Record<string, string> = {
  not_uploaded: "default",
  in_review: "gold",
  verified: "green",
  missing: "red",
};
// Hex equivalents of the Tag colors above, for the document row's left
// accent stripe - Tag's own preset color names aren't usable as a plain
// CSS background value.
const DOC_STATUS_ACCENT: Record<string, string> = {
  not_uploaded: appTokens.textTertiary,
  in_review: appTokens.warning,
  verified: appTokens.success,
  missing: appTokens.danger,
};
const DOC_STATUS_LABELS: Record<string, string> = {
  not_uploaded: "Not uploaded",
  in_review: "In review",
  verified: "Verified",
  missing: "Missing",
};

interface FofoHandoffDetailProps {
  leadId: string;
}

export function FofoHandoffDetail({ leadId }: FofoHandoffDetailProps) {
  const navigate = useNavigate();
  const hasPermission = useHasPermission();
  const [handoff, setHandoff] = useState<FofoHandoff | null>(null);
  const [consent, setConsent] = useState<LeadConsent | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const [pushing, setPushing] = useState(false);

  const load = () => {
    setLoading(true);
    fofoApi
      .getHandoff(leadId)
      .then((h) => {
        setHandoff(h);
        setConsent(h.consent);
      })
      .catch(() => message.error("Failed to load onboarding handoff"))
      .finally(() => setLoading(false));
  };

  useEffect(load, [leadId]);

  if (loading || !handoff) {
    return (
      <div style={{ textAlign: "center", padding: 60 }}>
        <Spin />
      </div>
    );
  }

  const { lead, documents } = handoff;
  const canManage = hasPermission("fofo_onboarding.manage");
  const canPush = hasPermission("fofo_onboarding.push");
  // The lead's mobile number becomes the store owner's SKIA FOFO app login,
  // so it's the one thing a push can't go without.
  const hasMobile = Boolean(lead.phone);

  const statusTag = lead.pushStatus === "pushed"
    ? { color: "blue", label: "Pushed" }
    : hasMobile
      ? { color: "green", label: "Ready to push" }
      : { color: "orange", label: "Mobile number needed" };

  const handlePush = async () => {
    setPushing(true);
    try {
      const { handoff: updated, message: successMessage } = await fofoApi.pushToOnboardingApp(leadId);
      setHandoff(updated);
      message.success(successMessage);
      // Back to the list so the newly-pushed record is visible there right
      // away, instead of leaving the user stranded on this detail screen.
      navigate("/fofo-onboarding");
    } catch (err) {
      message.error(errorMessageFrom(err, "Failed to push"));
    } finally {
      setPushing(false);
    }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
        <div>
          <Title level={3} style={{ margin: 0, letterSpacing: -0.3, color: appTokens.textPrimary }}>
            FOFO onboarding handoff
          </Title>
          <Text style={{ color: appTokens.textSecondary, fontSize: 13.5 }}>
            CRM collects and validates, then pushes the store to the onboarding app. Status flows back here.
          </Text>
        </div>
        {/* Hidden once pushed, not just disabled - a one-way action that's
            already happened has nothing left to click. Client-confirmed:
            the same person owning several franchises (several separate
            leads) is completely fine; it's specifically re-pushing this one
            lead a second time that's never valid. */}
        {canPush && lead.pushStatus !== "pushed" && (
          <Tooltip title={hasMobile ? undefined : "Add the client's mobile number first - it becomes their SKIA FOFO app login"}>
            <Popconfirm
              title="Push to SKIA FOFO?"
              description={`${lead.fullName} gets a SKIA FOFO app login on ${lead.phone}. This can't be undone.`}
              okText="Push"
              onConfirm={handlePush}
              disabled={!hasMobile}
            >
              <Button type="primary" loading={pushing} disabled={!hasMobile}>
                Push to onboarding app
              </Button>
            </Popconfirm>
          </Tooltip>
        )}
      </div>

      <div style={{ display: "flex", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 560px", minWidth: 320 }}>
          <div
            style={{
              border: `1px solid ${appTokens.borderLight}`,
              borderRadius: appTokens.radius,
              padding: 18,
              marginBottom: 16,
              background: appTokens.surface,
              boxShadow: appTokens.shadowXs,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
              <div style={{ display: "flex", gap: 10 }}>
                <Avatar size={40} style={{ background: avatarGradient(lead.fullName), fontWeight: 600 }}>
                  {initials(lead.fullName)}
                </Avatar>
                <div>
                  <Text strong style={{ fontSize: 15, display: "block" }}>
                    {lead.fullName}
                  </Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    FOFO{lead.leadNumber ? ` · Lead L-${lead.leadNumber}` : ""}
                    {lead.storeName ? ` · ${lead.storeName}` : ""}
                    {lead.storeCity ? ` — ${lead.storeCity}${lead.storeState ? `, ${lead.storeState}` : ""}` : ""} · owner {lead.ownerName ?? "Unassigned"}
                  </Text>
                </div>
              </div>
              <Tag color={statusTag.color}>{statusTag.label}</Tag>
            </div>

            <Steps current={currentStep} onChange={setCurrentStep} size="small" items={STEP_LABELS.map((title) => ({ title }))} />

            <div style={{ marginTop: 24 }}>
              {currentStep === 0 && <ApplicantStep leadId={leadId} lead={lead} onSaved={load} onNext={() => setCurrentStep(1)} />}
              {currentStep === 1 && <StoreStep leadId={leadId} lead={lead} onSaved={load} onNext={() => setCurrentStep(2)} onBack={() => setCurrentStep(0)} />}
              {currentStep === 2 && (
                <DocumentsStep leadId={leadId} documents={documents} canManage={canManage} onChanged={load} onNext={() => setCurrentStep(3)} onBack={() => setCurrentStep(1)} />
              )}
              {currentStep === 3 && <CommercialsStep leadId={leadId} lead={lead} onSaved={load} onNext={() => setCurrentStep(4)} onBack={() => setCurrentStep(2)} />}
              {currentStep === 4 && (
                <GoLivePushStep
                  leadId={leadId}
                  lead={lead}
                  onSaved={load}
                  onBack={() => setCurrentStep(3)}
                />
              )}
            </div>
          </div>
        </div>

        <div style={{ flex: "0 1 320px", minWidth: 280 }}>
          <HandoffPayloadCard lead={lead} documents={documents} consent={consent} />
        </div>
      </div>
    </div>
  );
}

function PayloadRow({ label, complete, detail }: { label: string; complete: boolean; detail: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid #f5f5f5" }}>
      <Space size={6}>
        {complete ? <CheckCircleFilled style={{ color: "#0ca30c" }} /> : <ExclamationCircleFilled style={{ color: "#faad14" }} />}
        <Text style={{ fontSize: 13 }}>{label}</Text>
      </Space>
      <Text type="secondary" style={{ fontSize: 12 }}>
        {detail}
      </Text>
    </div>
  );
}

function HandoffPayloadCard({ lead, documents, consent }: { lead: FofoHandoff["lead"]; documents: LeadDocument[]; consent: LeadConsent | null }) {
  const applicantFields = [lead.fullName, lead.entityType, lead.phone, lead.email, lead.panNumber, lead.aadhaarNumber, lead.gstNumber];
  const applicantFilled = applicantFields.filter(Boolean).length;

  const storeFields = [
    lead.storeName,
    lead.storeAddress || lead.addressLine1,
    lead.storeCity,
    lead.storeState,
    lead.storePincode,
    lead.carpetArea,
    lead.frontage,
    lead.ownership,
    lead.nearestCocoStore,
  ];
  const storeFilled = storeFields.filter(Boolean).length;

  const docsWithFile = documents.filter((d) => d.hasFile).length;

  const commercialFields = [lead.securityDeposit, lead.openingStock, lead.marginSlab, lead.creditLimitRequested, lead.creditCategory, lead.paymentTerms];
  const commercialFilled = commercialFields.filter((v) => v !== null && v !== undefined && v !== "").length;

  return (
    <div
      style={{
        border: `1px solid ${appTokens.borderLight}`,
        borderRadius: appTokens.radius,
        padding: 18,
        background: appTokens.surface,
        boxShadow: appTokens.shadowXs,
      }}
    >
      <Text strong style={{ display: "block", marginBottom: 8 }}>
        Handoff payload
      </Text>
      <PayloadRow label="Applicant & KYC" complete={applicantFilled === applicantFields.length} detail={`${applicantFilled} fields`} />
      <PayloadRow label="Store information sheet" complete={storeFilled === storeFields.length} detail={`${storeFilled} fields`} />
      <PayloadRow label="Documents" complete={docsWithFile === documents.length} detail={`${docsWithFile} of ${documents.length}`} />
      <PayloadRow label="Commercial terms" complete={commercialFilled === commercialFields.length} detail={lead.marginSlab || `${commercialFilled} fields`} />
      <PayloadRow label="Consent record" complete={consent?.captured === true} detail={consent?.captured ? formatDate(consent.capturedAt) : "Pending"} />
      <PayloadRow label="Credit category" complete={Boolean(lead.creditCategory)} detail={lead.creditCategory || "Not set"} />
      <div style={{ background: "#f0f7ff", borderRadius: 6, padding: "8px 10px", marginTop: 10 }}>
        <Text style={{ fontSize: 11, color: "#1677ff" }}>
          Every step is optional - push anytime. Pushing registers the store owner's app login (their mobile number) in SKIA FOFO and records a reference code here.
        </Text>
      </div>
    </div>
  );
}

interface StepFooterProps {
  onBack?: () => void;
  onNext?: () => void;
  saving: boolean;
  nextLabel?: string;
  /** True when this step has no surrounding <Form> (e.g. Documents), so the
   * next button must call onNext directly instead of relying on a form
   * submit that has nothing to submit to. */
  formless?: boolean;
}

function StepFooter({ onBack, onNext, saving, nextLabel = "Save & continue", formless = false }: StepFooterProps) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16 }}>
      <Text type="secondary" style={{ fontSize: 12 }}>
        Autosaved to the lead record - draft visible to everyone with access to this handoff
      </Text>
      <Space>
        {onBack && <Button onClick={onBack}>Back</Button>}
        {onNext && (
          <Button type="primary" htmlType={formless ? "button" : "submit"} onClick={formless ? onNext : undefined} loading={saving}>
            {nextLabel}
          </Button>
        )}
      </Space>
    </div>
  );
}

const ENTITY_TYPE_OPTIONS = ["Proprietorship", "Partnership", "Private limited", "LLP"].map((v) => ({ value: v, label: v }));

function ApplicantStep({ leadId, lead, onSaved, onNext }: { leadId: string; lead: FofoHandoff["lead"]; onSaved: () => void; onNext: () => void }) {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  const handleFinish = async (values: Record<string, unknown>) => {
    setSaving(true);
    try {
      await leadApi.updateLead(leadId, values);
      onSaved();
      onNext();
    } catch {
      message.error("Failed to save applicant details");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleFinish}
      initialValues={{
        fullName: lead.fullName,
        entityType: lead.entityType ?? undefined,
        phone: lead.phone ?? undefined,
        email: lead.email ?? undefined,
        panNumber: lead.panNumber ?? undefined,
        aadhaarNumber: lead.aadhaarNumber ?? undefined,
        gstNumber: lead.gstNumber ?? undefined,
      }}
    >
      <Form.Item name="fullName" label="Applicant name" rules={[{ required: true, message: "Required" }]}>
        <Input />
      </Form.Item>
      <Form.Item name="entityType" label="Entity type">
        <Select allowClear options={ENTITY_TYPE_OPTIONS} placeholder="Select entity type" />
      </Form.Item>
      <Form.Item name="phone" label="Mobile" rules={[{ pattern: /^\d{10}$/, message: "Enter a 10-digit mobile number" }]}>
        <Input maxLength={10} />
      </Form.Item>
      <Form.Item name="email" label="Email" normalize={normalizeEmail} rules={emailRules}>
        <Input />
      </Form.Item>
      <Form.Item
        name="panNumber"
        label="PAN"
        rules={[{ pattern: /^[A-Za-z]{5}[0-9]{4}[A-Za-z]$/, message: "Enter a valid PAN (e.g. ABCDE1234F)" }]}
        normalize={(value: string) => value?.toUpperCase()}
      >
        <Input placeholder="ABCDE1234F" maxLength={10} />
      </Form.Item>
      <Form.Item
        name="aadhaarNumber"
        label="Aadhaar"
        rules={[{ pattern: /^[2-9]\d{11}$/, message: "Enter a valid 12-digit Aadhaar number" }]}
      >
        <Input maxLength={12} />
      </Form.Item>
      <Form.Item
        name="gstNumber"
        label="GST number"
        rules={[{ pattern: /^\d{2}[A-Za-z]{5}\d{4}[A-Za-z][A-Za-z0-9][Zz][A-Za-z0-9]$/, message: "Enter a valid GSTIN" }]}
        normalize={(value: string) => value?.toUpperCase()}
      >
        <Input placeholder="22AAAAA0000A1Z5" maxLength={15} />
      </Form.Item>
      <StepFooter onNext={onNext} saving={saving} />
    </Form>
  );
}

const OWNERSHIP_OPTIONS = ["Owned", "Leased", "Rented"].map((v) => ({ value: v, label: v }));
const SIGNAGE_OPTIONS = ["Pending ops sign-off", "Approved", "Not required"].map((v) => ({ value: v, label: v }));

function StoreStep({
  leadId,
  lead,
  onSaved,
  onNext,
  onBack,
}: {
  leadId: string;
  lead: FofoHandoff["lead"];
  onSaved: () => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  const handleFinish = async (values: Record<string, unknown>) => {
    setSaving(true);
    try {
      await leadApi.updateLead(leadId, { hasStoreLocation: true, ...values });
      onSaved();
      onNext();
    } catch {
      message.error("Failed to save store information");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleFinish}
      initialValues={{
        storeName: lead.storeName ?? undefined,
        storeAddress: lead.storeAddress ?? lead.addressLine1 ?? undefined,
        storeCity: lead.storeCity ?? undefined,
        storeState: lead.storeState ?? undefined,
        storePincode: lead.storePincode ?? undefined,
        carpetArea: lead.carpetArea ?? undefined,
        frontage: lead.frontage ?? undefined,
        ownership: lead.ownership ?? undefined,
        nearestCocoStore: lead.nearestCocoStore ?? undefined,
        signageStatus: lead.signageStatus ?? undefined,
      }}
    >
      <Form.Item name="storeName" label="Store name">
        <Input />
      </Form.Item>
      <Form.Item name="storeAddress" label="Address line 1">
        <Input />
      </Form.Item>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
        <Form.Item name="storeCity" label="City">
          <Input />
        </Form.Item>
        <Form.Item name="storeState" label="City / State">
          <Input />
        </Form.Item>
      </div>
      <Form.Item name="storePincode" label="Pin code">
        <Input />
      </Form.Item>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
        <Form.Item name="carpetArea" label="Carpet area">
          <InputNumber style={{ width: "100%" }} min={0} suffix="sq ft" placeholder="e.g. 620" />
        </Form.Item>
        <Form.Item name="frontage" label="Frontage">
          <InputNumber style={{ width: "100%" }} min={0} suffix="ft" placeholder="e.g. 14" />
        </Form.Item>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
        <Form.Item name="ownership" label="Ownership">
          <Select allowClear options={OWNERSHIP_OPTIONS} placeholder="Select ownership" />
        </Form.Item>
        <Form.Item
          name="nearestCocoStore"
          label="Nearest COCO store"
          rules={[{ pattern: /^((?!-\d).)*$/, message: "Can't contain a negative number" }]}
        >
          <Input placeholder="e.g. Baner - 6.2 km" />
        </Form.Item>
      </div>
      <Form.Item name="signageStatus" label="Signage approved">
        <Select allowClear options={SIGNAGE_OPTIONS} placeholder="Select status" />
      </Form.Item>
      <StepFooter onBack={onBack} onNext={onNext} saving={saving} />
    </Form>
  );
}

function DocumentsStep({
  leadId,
  documents,
  canManage,
  onChanged,
  onNext,
  onBack,
}: {
  leadId: string;
  documents: LeadDocument[];
  canManage: boolean;
  onChanged: () => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const hasPermission = useHasPermission();
  const canUpload = hasPermission("fofo_onboarding.upload_document");

  const handleUpload = async (docType: string, file: File) => {
    try {
      await fofoApi.uploadDocument(leadId, docType, file);
      message.success("Document uploaded");
      onChanged();
    } catch {
      message.error("Failed to upload document");
    }
  };

  const handleDownload = async (doc: LeadDocument) => {
    try {
      await fofoApi.downloadDocument(doc.id, doc.originalFilename ?? doc.label);
    } catch {
      message.error("Failed to download document");
    }
  };

  const handleStatus = async (doc: LeadDocument, status: "verified" | "missing") => {
    try {
      await fofoApi.updateDocumentStatus(doc.id, status);
      onChanged();
    } catch {
      message.error("Failed to update document status");
    }
  };

  const handleDelete = async (doc: LeadDocument) => {
    try {
      await fofoApi.deleteDocument(doc.id);
      onChanged();
    } catch {
      message.error("Failed to remove document");
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {documents.map((doc) => (
        <div
          key={doc.id}
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            // Wraps the action buttons onto their own line on a phone instead
            // of a long filename pushing Replace/Upload off-screen.
            flexWrap: "wrap",
            gap: 8,
            padding: "10px 14px",
            background: appTokens.surfaceMuted,
            borderRadius: appTokens.radiusSm,
            borderLeft: `3px solid ${DOC_STATUS_ACCENT[doc.status] ?? appTokens.textTertiary}`,
          }}
        >
          <div style={{ minWidth: 0, flex: "1 1 160px" }}>
            <Text strong style={{ display: "block", fontSize: 13 }}>
              {doc.label}
            </Text>
            {doc.hasFile && (
              <Text type="secondary" style={{ display: "block", fontSize: 11, overflowWrap: "anywhere" }}>
                {doc.originalFilename}
              </Text>
            )}
          </div>
          <Space size={8} wrap>
            <Tag color={DOC_STATUS_COLORS[doc.status]}>{DOC_STATUS_LABELS[doc.status]}</Tag>
            {doc.hasFile && (
              <Button size="small" icon={<DownloadOutlined />} onClick={() => handleDownload(doc)} />
            )}
            <DocumentHistoryButton leadId={leadId} docType={doc.docType} docLabel={doc.label} onRestored={onChanged} />
            {canManage && doc.hasFile && doc.status !== "verified" && (
              <Button size="small" onClick={() => handleStatus(doc, "verified")}>
                Verify
              </Button>
            )}
            {canManage && doc.hasFile && (
              <Popconfirm title="Archive this document?" onConfirm={() => handleDelete(doc)}>
                <Button size="small">
                  Archive
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
      <StepFooter onBack={onBack} onNext={onNext} saving={false} nextLabel="Continue" formless />
    </div>
  );
}

function CommercialsStep({
  leadId,
  lead,
  onSaved,
  onNext,
  onBack,
}: {
  leadId: string;
  lead: FofoHandoff["lead"];
  onSaved: () => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  const handleFinish = async (values: Record<string, unknown>) => {
    setSaving(true);
    try {
      await leadApi.updateLead(leadId, values);
      onSaved();
      onNext();
    } catch {
      message.error("Failed to save commercials");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleFinish}
      initialValues={{
        securityDeposit: lead.securityDeposit ?? undefined,
        openingStock: lead.openingStock ?? undefined,
        marginSlab: lead.marginSlab ?? undefined,
        creditLimitRequested: lead.creditLimitRequested ?? undefined,
        creditCategory: lead.creditCategory ?? undefined,
        paymentTerms: lead.paymentTerms ?? undefined,
      }}
    >
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
        <Form.Item name="securityDeposit" label="Security deposit">
          <InputNumber prefix="₹" min={0} style={{ width: "100%" }} />
        </Form.Item>
        <Form.Item name="openingStock" label="Opening stock">
          <InputNumber prefix="₹" min={0} style={{ width: "100%" }} />
        </Form.Item>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
        <Form.Item
          name="marginSlab"
          label="Margin slab"
          rules={[{ pattern: /^((?!-\d).)*$/, message: "Can't contain a negative number" }]}
        >
          <Input placeholder="e.g. Slab B — 22%" />
        </Form.Item>
        <Form.Item name="creditLimitRequested" label="Credit limit requested">
          <InputNumber prefix="₹" min={0} style={{ width: "100%" }} />
        </Form.Item>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
        <Form.Item name="creditCategory" label="Credit category">
          <Input placeholder="e.g. Awaiting finance" />
        </Form.Item>
        <Form.Item name="paymentTerms" label="Payment days">
          <InputNumber style={{ width: "100%" }} min={0} suffix="days" placeholder="e.g. 21" />
        </Form.Item>
      </div>
      <StepFooter onBack={onBack} onNext={onNext} saving={saving} />
    </Form>
  );
}

function GoLivePushStep({
  leadId,
  lead,
  onSaved,
  onBack,
}: {
  leadId: string;
  lead: FofoHandoff["lead"];
  onSaved: () => void;
  onBack: () => void;
}) {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  const handleFinish = async (values: { targetGoLive?: dayjs.Dayjs }) => {
    setSaving(true);
    try {
      await leadApi.updateLead(leadId, { targetGoLive: values.targetGoLive?.format("YYYY-MM-DD") });
      onSaved();
      message.success("Saved");
    } catch {
      message.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleFinish}
      initialValues={{ targetGoLive: lead.targetGoLive ? dayjs(lead.targetGoLive) : undefined }}
    >
      <Form.Item name="targetGoLive" label="Target go-live">
        <DatePicker style={{ width: "100%" }} format="D MMM YYYY" disabledDate={(d) => d.isBefore(dayjs(), "day")} />
      </Form.Item>
      <Form.Item label="Onboarding app ID">
        <Input disabled value={lead.onboardingAppId ?? "Not yet created"} />
      </Form.Item>
      <Form.Item label="Push status">
        <Input disabled value={lead.pushStatus === "pushed" ? `Pushed ${formatDate(lead.pushedAt)}` : lead.phone ? "Ready to push" : "Add the client's mobile number to push"} />
      </Form.Item>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16 }}>
        <Text type="secondary" style={{ fontSize: 12 }}>
          Push to onboarding app from the button at the top - none of the steps are required
        </Text>
        <Space>
          <Button onClick={onBack}>Back</Button>
          <Button type="primary" htmlType="submit" loading={saving}>
            Save
          </Button>
        </Space>
      </div>
    </Form>
  );
}
