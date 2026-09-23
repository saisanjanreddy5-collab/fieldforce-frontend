import { useEffect, useState } from "react";
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
  Typography,
  Upload,
  message,
} from "antd";
import { CheckCircleFilled, DownloadOutlined, ExclamationCircleFilled, InboxOutlined } from "@ant-design/icons";
import { isAxiosError } from "axios";
import dayjs from "dayjs";
import * as fofoApi from "../../api/fofo-onboarding-api";
import * as leadApi from "../../api/lead-api";
import type { ApprovalStep, FofoHandoff, LeadDocument } from "../../types/fofo-onboarding";
import type { LeadConsent } from "../../types/lead";
import { useAuth } from "../../context/AuthContext";
import { useHasPermission } from "../../hooks/use-permission";
import { formatDate, initials } from "../../utils/lead-format";
import { appTokens, avatarGradient } from "../../utils/design-system";

const { Text, Title } = Typography;

const STEP_LABELS = ["Applicant", "Store information", "Documents & KYC", "Commercials", "Approval & push"];

const STEP_STATUS_COLORS: Record<string, string> = {
  pending: "orange",
  approved: "green",
  rejected: "red",
  not_applicable: "default",
};
const STEP_STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  not_applicable: "Not required",
};

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

interface FofoHandoffDetailProps {
  leadId: string;
}

export function FofoHandoffDetail({ leadId }: FofoHandoffDetailProps) {
  const { user } = useAuth();
  const hasPermission = useHasPermission();
  const [handoff, setHandoff] = useState<FofoHandoff | null>(null);
  const [consent, setConsent] = useState<LeadConsent | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const [pushing, setPushing] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([fofoApi.getHandoff(leadId), leadApi.getLeadConsent(leadId)])
      .then(([h, c]) => {
        setHandoff(h);
        setConsent(c);
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

  const { lead, approvalSteps, documents } = handoff;
  const canManage = hasPermission("fofo_onboarding.manage");

  const allResolved = approvalSteps.every((s) => s.status === "approved" || s.status === "not_applicable");
  const anyRejected = approvalSteps.some((s) => s.status === "rejected");
  const statusTag = lead.pushStatus === "pushed"
    ? { color: "blue", label: "Pushed" }
    : anyRejected
      ? { color: "red", label: "Rejected" }
      : allResolved
        ? { color: "green", label: "Ready to push" }
        : { color: "orange", label: "Handoff pending" };

  const handlePush = async () => {
    setPushing(true);
    try {
      const updated = await fofoApi.pushToOnboardingApp(leadId);
      setHandoff(updated);
      message.success("Pushed to onboarding app");
    } catch (err) {
      const description =
        isAxiosError<{ message?: string }>(err) && err.response?.data.message ? err.response.data.message : "Failed to push";
      message.error(description);
    } finally {
      setPushing(false);
    }
  };

  const handleDecide = async (stepId: string, decision: "approved" | "rejected") => {
    try {
      const updated = await fofoApi.decideStep(stepId, decision);
      setHandoff(updated);
      message.success(decision === "approved" ? "Step approved" : "Step rejected");
    } catch (err) {
      const description =
        isAxiosError<{ message?: string }>(err) && err.response?.data.message ? err.response.data.message : "Failed to decide step";
      message.error(description);
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
        {canManage && (
          <Button type="primary" loading={pushing} onClick={handlePush}>
            Push to onboarding app
          </Button>
        )}
      </div>

      <div style={{ display: "flex", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 560px", minWidth: 320 }}>
          <div
            style={{
              border: `1px solid ${appTokens.border}`,
              borderRadius: appTokens.radius,
              padding: 18,
              marginBottom: 16,
              background: appTokens.surface,
              boxShadow: appTokens.shadowXs,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
              <div style={{ display: "flex", gap: 10 }}>
                <Avatar size={40} style={{ background: avatarGradient(lead.storeName || lead.fullName), fontWeight: 600 }}>
                  {initials(lead.storeName || lead.fullName)}
                </Avatar>
                <div>
                  <Text strong style={{ fontSize: 15, display: "block" }}>
                    {lead.storeName || lead.fullName}
                    {lead.storeCity ? ` — ${lead.storeCity}${lead.storeState ? `, ${lead.storeState}` : ""}` : ""}
                  </Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    FOFO{lead.leadNumber ? ` · Lead L-${lead.leadNumber}` : ""} · owner {lead.ownerName ?? "Unassigned"}
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
                <ApprovalPushStep
                  leadId={leadId}
                  lead={lead}
                  approvalSteps={approvalSteps}
                  onSaved={load}
                  onBack={() => setCurrentStep(3)}
                />
              )}
            </div>
          </div>
        </div>

        <div style={{ flex: "0 1 320px", minWidth: 280 }}>
          <div
            style={{
              border: `1px solid ${appTokens.border}`,
              borderRadius: appTokens.radius,
              padding: 18,
              marginBottom: 16,
              background: appTokens.surface,
              boxShadow: appTokens.shadowXs,
            }}
          >
            <Text strong style={{ display: "block", marginBottom: 12 }}>
              Approval chain
            </Text>
            {approvalSteps.length === 0 && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                No one above this lead's owner in the reporting chain yet.
              </Text>
            )}
            {approvalSteps.map((step) => (
              <div key={step.id} style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <Avatar size={28} style={{ background: avatarGradient(step.approverName ?? "?"), fontSize: 12, fontWeight: 600 }}>
                      {step.approverName ? initials(step.approverName) : "?"}
                    </Avatar>
                    <div>
                      <Text strong style={{ fontSize: 13, display: "block" }}>
                        {step.approverName ?? "Unassigned"}
                      </Text>
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        {step.roleLabel}
                        {step.conditionNote ? ` (${step.conditionNote})` : ""}
                      </Text>
                    </div>
                  </div>
                  <Tag color={STEP_STATUS_COLORS[step.status]}>{STEP_STATUS_LABELS[step.status]}</Tag>
                </div>
                {step.isCurrentTurn && user?.id === step.approverUserId && (
                  <Space size={4} style={{ marginTop: 6, marginLeft: 36 }}>
                    <Button size="small" type="primary" onClick={() => handleDecide(step.id, "approved")}>
                      Approve
                    </Button>
                    <Button size="small" danger onClick={() => handleDecide(step.id, "rejected")}>
                      Reject
                    </Button>
                  </Space>
                )}
              </div>
            ))}
          </div>

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
  const applicantFields = [lead.fullName, lead.entityType, lead.phone, lead.email, lead.panNumber, lead.aadhaarNumber];
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
        border: `1px solid ${appTokens.border}`,
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
          No external onboarding system is connected yet - pushing marks this handoff as complete here and records a reference code.
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
      }}
    >
      <Form.Item name="fullName" label="Applicant name" rules={[{ required: true, message: "Required" }]}>
        <Input />
      </Form.Item>
      <Form.Item name="entityType" label="Entity type">
        <Select allowClear options={ENTITY_TYPE_OPTIONS} placeholder="Select entity type" />
      </Form.Item>
      <Form.Item name="phone" label="Mobile">
        <Input />
      </Form.Item>
      <Form.Item name="email" label="Email">
        <Input />
      </Form.Item>
      <Form.Item name="panNumber" label="PAN">
        <Input />
      </Form.Item>
      <Form.Item name="aadhaarNumber" label="Aadhaar">
        <Input />
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
      <Form.Item name="storeName" label="Store name" rules={[{ required: true, message: "Required" }]}>
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
          <Input placeholder="e.g. 620 sq ft" />
        </Form.Item>
        <Form.Item name="frontage" label="Frontage">
          <Input placeholder="e.g. 14 ft" />
        </Form.Item>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
        <Form.Item name="ownership" label="Ownership">
          <Select allowClear options={OWNERSHIP_OPTIONS} placeholder="Select ownership" />
        </Form.Item>
        <Form.Item name="nearestCocoStore" label="Nearest COCO store">
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
    <div>
      {documents.map((doc) => (
        <div
          key={doc.id}
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "10px 0",
            borderBottom: "1px solid #f5f5f5",
          }}
        >
          <div>
            <Text strong style={{ display: "block", fontSize: 13 }}>
              {doc.label}
            </Text>
            {doc.hasFile && (
              <Text type="secondary" style={{ fontSize: 11 }}>
                {doc.originalFilename}
              </Text>
            )}
          </div>
          <Space size={8}>
            <Tag color={DOC_STATUS_COLORS[doc.status]}>{DOC_STATUS_LABELS[doc.status]}</Tag>
            {doc.hasFile && (
              <Button size="small" icon={<DownloadOutlined />} onClick={() => handleDownload(doc)} />
            )}
            {canManage && doc.hasFile && doc.status !== "verified" && (
              <Button size="small" onClick={() => handleStatus(doc, "verified")}>
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
        <Form.Item name="marginSlab" label="Margin slab">
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
        <Form.Item name="paymentTerms" label="Payment terms">
          <Input placeholder="e.g. Net 21 days" />
        </Form.Item>
      </div>
      <StepFooter onBack={onBack} onNext={onNext} saving={saving} />
    </Form>
  );
}

function ApprovalPushStep({
  leadId,
  lead,
  approvalSteps,
  onSaved,
  onBack,
}: {
  leadId: string;
  lead: FofoHandoff["lead"];
  approvalSteps: ApprovalStep[];
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
      {approvalSteps.map((step) => (
        <Form.Item key={step.id} label={step.roleLabel}>
          <Input
            disabled
            value={`${step.status === "not_applicable" ? "Not required" : STEP_STATUS_LABELS[step.status]}${
              step.approverName ? ` — ${step.approverName}` : ""
            }`}
          />
        </Form.Item>
      ))}
      <Form.Item name="targetGoLive" label="Target go-live">
        <DatePicker style={{ width: "100%" }} />
      </Form.Item>
      <Form.Item label="Onboarding app ID">
        <Input disabled value={lead.onboardingAppId ?? "Not yet created"} />
      </Form.Item>
      <Form.Item label="Push status">
        <Input disabled value={lead.pushStatus === "pushed" ? `Pushed ${formatDate(lead.pushedAt)}` : "Ready when approvals clear"} />
      </Form.Item>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16 }}>
        <Text type="secondary" style={{ fontSize: 12 }}>
          Push to onboarding app from the button at the top once every step above is approved
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
