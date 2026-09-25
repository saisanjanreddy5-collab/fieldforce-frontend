import { useEffect, useState } from "react";
import { Button, DatePicker, Drawer, Form, Input, InputNumber, Select, Space, Tabs, Tooltip, Typography, message } from "antd";
import {
  BankOutlined,
  ContactsOutlined,
  EnvironmentOutlined,
  FileProtectOutlined,
  FileTextOutlined,
  HomeOutlined,
  IdcardOutlined,
  InfoCircleOutlined,
  SafetyCertificateOutlined,
  ShopOutlined,
  UserOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import * as leadApi from "../../api/lead-api";
import type { CreateLeadPayload, Lead } from "../../types/lead";
import { LEAD_CATEGORY_VALUES, LEAD_STATUS_VALUES } from "../../utils/lead-constants";
import { errorMessageFrom } from "../../utils/api-error";
import { FormSection, FormSectionFullWidth } from "./FormSection";
import { ConsentTab } from "./tabs/ConsentTab";

const { Text } = Typography;

interface LeadFormDrawerProps {
  open: boolean;
  lead: Lead | null;
  onClose: () => void;
  /** `keepOpen` is true for "Save & add another" - the caller must refresh
   * its lead list/count but leave the drawer open instead of closing it. */
  onSaved: (lead: Lead, keepOpen: boolean) => void;
}

interface FormValues {
  fullName: string;
  contactName?: string;
  profession?: string;
  startDate?: dayjs.Dayjs;
  qualifiedPerson?: string;
  financialStatus?: string;
  welcomeMessageSent?: boolean;
  status?: string;
  prospectStatus?: string;
  category?: string;
  leadScore?: number;

  phone?: string;
  altPhone?: string;
  email?: string;
  website?: string;
  preferredLanguage?: string;
  pincode?: string;
  addressLine1?: string;
  addressLine2?: string;
  territory?: string;

  companyName?: string;
  source?: string;
  inquiryCategory?: string;
  inquirySource?: string;
  captureChannel?: string;
  utmTags?: string;
  expectedValue?: number;
  receivedAt?: dayjs.Dayjs;
  internalNotes?: string;
  rmRemark?: string;
  lgRemark?: string;

  hasStoreLocation?: boolean;
  storeName?: string;
  storeAddress?: string;
  storePincode?: string;
  storeCity?: string;
  storeState?: string;
  carpetArea?: string;
  frontage?: string;
  ownership?: string;
  investmentCapacity?: number;
  existingBusiness?: string;
  expectedOpening?: dayjs.Dayjs;
  gstNumber?: string;
  panNumber?: string;
  drugLicenceNumber?: string;
  fssaiNumber?: string;

  consentCaptured?: boolean;
  consentMethod?: string;
  consentPurposes?: string;
  consentEvidenceRef?: string;
  consentNotes?: string;
}

const YES_NO = [
  { value: true, label: "Yes" },
  { value: false, label: "No" },
];

const CAPTURE_CHANNEL_OPTIONS = [
  { value: "web_form", label: "Web form" },
  { value: "qr_scan", label: "QR scan" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "call_centre", label: "Call centre" },
  { value: "import", label: "Import" },
  { value: "manual_entry", label: "Manual entry" },
];

const emptyValues: FormValues = { fullName: "" };

export function LeadFormDrawer({ open, lead, onClose, onSaved }: LeadFormDrawerProps) {
  const [form] = Form.useForm<FormValues>();
  const [submitting, setSubmitting] = useState<"save" | "saveAndAddAnother" | null>(null);
  const isEdit = lead !== null;

  // Auto-captured fields (Inquiry Category/Source) are locked whenever the
  // channel that produced this lead isn't manual entry - real fields, just
  // a new honest interaction: switching to Manual entry unlocks them.
  const captureChannel = Form.useWatch("captureChannel", form);
  const inquiryFieldsLocked = Boolean(captureChannel) && captureChannel !== "manual_entry";

  useEffect(() => {
    if (!open) return;

    if (lead) {
      form.setFieldsValue({
        fullName: lead.fullName,
        contactName: lead.contactName ?? undefined,
        profession: lead.profession ?? undefined,
        startDate: lead.startDate ? dayjs(lead.startDate) : undefined,
        qualifiedPerson: lead.qualifiedPerson ?? undefined,
        financialStatus: lead.financialStatus ?? undefined,
        welcomeMessageSent: lead.welcomeMessageSent ?? undefined,
        status: lead.status,
        prospectStatus: lead.prospectStatus ?? undefined,
        category: lead.category ?? undefined,
        leadScore: lead.leadScore ?? undefined,
        phone: lead.phone ?? undefined,
        altPhone: lead.altPhone ?? undefined,
        email: lead.email ?? undefined,
        website: lead.website ?? undefined,
        preferredLanguage: lead.preferredLanguage ?? undefined,
        pincode: lead.pincode ?? undefined,
        addressLine1: lead.addressLine1 ?? undefined,
        addressLine2: lead.addressLine2 ?? undefined,
        territory: lead.territory ?? undefined,
        companyName: lead.companyName ?? undefined,
        source: lead.source ?? undefined,
        inquiryCategory: lead.inquiryCategory ?? undefined,
        inquirySource: lead.inquirySource ?? undefined,
        captureChannel: lead.captureChannel ?? undefined,
        utmTags: lead.utmTags ?? undefined,
        expectedValue: lead.expectedValue ?? undefined,
        receivedAt: lead.receivedAt ? dayjs(lead.receivedAt) : undefined,
        internalNotes: lead.internalNotes ?? undefined,
        rmRemark: lead.rmRemark ?? undefined,
        lgRemark: lead.lgRemark ?? undefined,
        hasStoreLocation: lead.hasStoreLocation ?? undefined,
        storeName: lead.storeName ?? undefined,
        storeAddress: lead.storeAddress ?? undefined,
        storePincode: lead.storePincode ?? undefined,
        storeCity: lead.storeCity ?? undefined,
        storeState: lead.storeState ?? undefined,
        carpetArea: lead.carpetArea ?? undefined,
        frontage: lead.frontage ?? undefined,
        ownership: lead.ownership ?? undefined,
        investmentCapacity: lead.investmentCapacity ?? undefined,
        existingBusiness: lead.existingBusiness ?? undefined,
        expectedOpening: lead.expectedOpening ? dayjs(lead.expectedOpening) : undefined,
        gstNumber: lead.gstNumber ?? undefined,
        panNumber: lead.panNumber ?? undefined,
        drugLicenceNumber: lead.drugLicenceNumber ?? undefined,
        fssaiNumber: lead.fssaiNumber ?? undefined,
      });
    } else {
      form.resetFields();
    }
  }, [open, lead, form]);

  const handleSubmit = async (values: FormValues, mode: "save" | "saveAndAddAnother") => {
    setSubmitting(mode);

    const payload: Partial<CreateLeadPayload> = {
      fullName: values.fullName,
      contactName: values.contactName,
      profession: values.profession,
      startDate: values.startDate?.toISOString(),
      qualifiedPerson: values.qualifiedPerson,
      financialStatus: values.financialStatus,
      welcomeMessageSent: values.welcomeMessageSent,
      status: values.status,
      prospectStatus: values.prospectStatus,
      category: values.category,
      leadScore: values.leadScore,
      phone: values.phone,
      altPhone: values.altPhone,
      email: values.email,
      website: values.website,
      preferredLanguage: values.preferredLanguage,
      pincode: values.pincode,
      addressLine1: values.addressLine1,
      addressLine2: values.addressLine2,
      territory: values.territory,
      companyName: values.companyName,
      source: values.source,
      inquiryCategory: values.inquiryCategory,
      inquirySource: values.inquirySource,
      captureChannel: values.captureChannel,
      utmTags: values.utmTags,
      expectedValue: values.expectedValue,
      receivedAt: values.receivedAt?.toISOString(),
      internalNotes: values.internalNotes,
      rmRemark: values.rmRemark,
      lgRemark: values.lgRemark,
      hasStoreLocation: values.hasStoreLocation,
      storeName: values.storeName,
      storeAddress: values.storeAddress,
      storePincode: values.storePincode,
      storeCity: values.storeCity,
      storeState: values.storeState,
      carpetArea: values.carpetArea,
      frontage: values.frontage,
      ownership: values.ownership,
      investmentCapacity: values.investmentCapacity,
      existingBusiness: values.existingBusiness,
      expectedOpening: values.expectedOpening?.toISOString(),
      gstNumber: values.gstNumber,
      panNumber: values.panNumber,
      drugLicenceNumber: values.drugLicenceNumber,
      fssaiNumber: values.fssaiNumber,
    };

    if (!isEdit && (values.consentCaptured || values.consentMethod || values.consentPurposes)) {
      payload.consent = {
        captured: values.consentCaptured,
        method: values.consentMethod,
        purposes: values.consentPurposes,
        evidenceRef: values.consentEvidenceRef,
        notes: values.consentNotes,
      };
    }

    try {
      const saved = isEdit ? await leadApi.updateLead(lead.id, payload) : await leadApi.createLead(payload as CreateLeadPayload);
      if (mode === "saveAndAddAnother") {
        message.success("Lead created - form cleared for the next one");
        form.resetFields();
        form.setFieldsValue(emptyValues);
        onSaved(saved, true);
      } else {
        message.success(isEdit ? "Lead updated" : "Lead created");
        onSaved(saved, false);
      }
    } catch (err) {
      message.error(errorMessageFrom(err, "Failed to save lead"));
    } finally {
      setSubmitting(null);
    }
  };

  const customerRequired = 1; // fullName
  const statusRequired = 1; // category

  return (
    <Drawer
      title={
        <div>
          <div>{isEdit ? "Edit lead" : "New lead"}</div>
          {!isEdit && (
            <Text type="secondary" style={{ fontSize: 12, fontWeight: 400 }}>
              Assignment and scoring run once you save.
            </Text>
          )}
        </div>
      }
      open={open}
      onClose={onClose}
      size={760}
      destroyOnHidden
      styles={{ body: { paddingTop: 16, background: "#fafafa" } }}
      footer={
        <Space style={{ display: "flex", justifyContent: "flex-end", width: "100%" }}>
          <Button onClick={onClose}>Cancel</Button>
          {!isEdit && (
            <Button
              loading={submitting === "saveAndAddAnother"}
              disabled={submitting === "save"}
              onClick={() => form.validateFields().then((values) => handleSubmit(values, "saveAndAddAnother"))}
            >
              Save & add another
            </Button>
          )}
          <Button
            type="primary"
            loading={submitting === "save"}
            disabled={submitting === "saveAndAddAnother"}
            onClick={() => form.validateFields().then((values) => handleSubmit(values, "save"))}
          >
            Save lead
          </Button>
        </Space>
      }
    >
      <Form form={form} layout="vertical" requiredMark={false}>
        <Tabs
          items={[
            {
              key: "customer",
              label: (
                <span>
                  Customer
                  <Text type="secondary" style={{ fontSize: 11, marginLeft: 4 }}>
                    {customerRequired + statusRequired}
                  </Text>
                </span>
              ),
              children: (
                <>
                  <FormSection
                    icon={<UserOutlined />}
                    iconColor="#1677ff"
                    title="Customer information"
                    description="Who the franchise applicant is"
                    requiredCount={customerRequired}
                  >
                    <Form.Item name="fullName" label="Full Name" rules={[{ required: true, message: "Required" }]}>
                      <Input />
                    </Form.Item>
                    <Form.Item name="contactName" label="Contact Name">
                      <Input />
                    </Form.Item>
                    <Form.Item name="profession" label="Profession">
                      <Input />
                    </Form.Item>
                    <Form.Item name="startDate" label="Start Date">
                      <DatePicker style={{ width: "100%" }} />
                    </Form.Item>
                    <Form.Item name="qualifiedPerson" label="Qualified Person">
                      <Input placeholder="e.g. Yes — B.Pharm" />
                    </Form.Item>
                    <Form.Item name="financialStatus" label="Financial Status">
                      <Input placeholder="e.g. Self + bank loan" />
                    </Form.Item>
                  </FormSection>

                  <FormSection
                    icon={<InfoCircleOutlined />}
                    iconColor="#7248b8"
                    title="Lead status"
                    description="Where this enquiry currently stands"
                    requiredCount={statusRequired}
                  >
                    <Form.Item name="welcomeMessageSent" label="Welcome Message Sent">
                      <Select options={YES_NO} allowClear />
                    </Form.Item>
                    <Form.Item name="status" label="Status">
                      <Select allowClear options={LEAD_STATUS_VALUES.map((value) => ({ value, label: value }))} />
                    </Form.Item>
                    <Form.Item name="prospectStatus" label="Prospect Status">
                      <Select allowClear options={["Hot", "Warm", "Cold"].map((value) => ({ value, label: value }))} />
                    </Form.Item>
                    <Form.Item name="category" label="Category" rules={[{ required: true, message: "Required" }]}>
                      <Select options={LEAD_CATEGORY_VALUES.map((value) => ({ value, label: value }))} />
                    </Form.Item>
                    <Form.Item name="leadScore" label="Lead Score (%)">
                      <InputNumber min={0} max={100} style={{ width: "100%" }} />
                    </Form.Item>
                  </FormSection>
                </>
              ),
            },
            {
              key: "contact",
              label: "Contact",
              children: (
                <>
                  <FormSection icon={<ContactsOutlined />} iconColor="#0ca30c" title="Contact details" description="How we reach them">
                    <Form.Item name="phone" label="Phone Number">
                      <Input />
                    </Form.Item>
                    <Form.Item name="altPhone" label="Alternative Mobile Number">
                      <Input />
                    </Form.Item>
                    <Form.Item name="email" label="Email address" rules={[{ type: "email", message: "Invalid email" }]}>
                      <Input />
                    </Form.Item>
                    <Form.Item name="website" label="Website">
                      <Input />
                    </Form.Item>
                    <Form.Item name="preferredLanguage" label="Preferred language">
                      <Input />
                    </Form.Item>
                  </FormSection>

                  <FormSection icon={<EnvironmentOutlined />} iconColor="#eda100" title="Address" description="Where this lead is located">
                    <Form.Item name="pincode" label="PinCode">
                      <Input />
                    </Form.Item>
                    <Form.Item name="territory" label="Territory">
                      <Input placeholder="e.g. AP South · Guntur" />
                    </Form.Item>
                    <Form.Item name="addressLine1" label="Address line 1">
                      <Input />
                    </Form.Item>
                    <Form.Item name="addressLine2" label="Address line 2">
                      <Input />
                    </Form.Item>
                  </FormSection>
                </>
              ),
            },
            {
              key: "inquiry",
              label: "Inquiry",
              children: (
                <>
                  <FormSection
                    icon={<FileTextOutlined />}
                    iconColor="#2a78d6"
                    title="Captured automatically"
                    description="Category and source come from where the lead arrived"
                  >
                    <FormSectionFullWidth>
                      <Form.Item name="captureChannel" label="Capture channel">
                        <Select allowClear options={CAPTURE_CHANNEL_OPTIONS} />
                      </Form.Item>
                    </FormSectionFullWidth>
                    {inquiryFieldsLocked && (
                      <FormSectionFullWidth>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          Inquiry Category and Inquiry Source are filled from the capture channel and locked. Switch to Manual entry to set them
                          yourself.
                        </Text>
                      </FormSectionFullWidth>
                    )}
                  </FormSection>

                  <FormSection icon={<BankOutlined />} iconColor="#1677ff" title="Inquiry details" description="Category and source of the enquiry">
                    <Form.Item name="companyName" label="Company name">
                      <Input />
                    </Form.Item>
                    <Form.Item name="expectedValue" label="Expected value">
                      <InputNumber style={{ width: "100%" }} min={0} prefix="₹" />
                    </Form.Item>
                    <Form.Item
                      name="inquiryCategory"
                      label={
                        <span>
                          Inquiry Category{" "}
                          {inquiryFieldsLocked && (
                            <Tooltip title="Locked because this lead's capture channel isn't Manual entry">
                              <span style={{ fontSize: 10, color: "#ad6800", background: "#fff7ec", border: "1px solid #ffe7ba", borderRadius: 999, padding: "0 6px" }}>
                                AUTO
                              </span>
                            </Tooltip>
                          )}
                        </span>
                      }
                    >
                      <Input disabled={inquiryFieldsLocked} />
                    </Form.Item>
                    <Form.Item
                      name="inquirySource"
                      label={
                        <span>
                          Inquiry Source{" "}
                          {inquiryFieldsLocked && (
                            <Tooltip title="Locked because this lead's capture channel isn't Manual entry">
                              <span style={{ fontSize: 10, color: "#ad6800", background: "#fff7ec", border: "1px solid #ffe7ba", borderRadius: 999, padding: "0 6px" }}>
                                AUTO
                              </span>
                            </Tooltip>
                          )}
                        </span>
                      }
                    >
                      <Input disabled={inquiryFieldsLocked} />
                    </Form.Item>
                    <Form.Item name="utmTags" label="UTM / campaign tags">
                      <Input />
                    </Form.Item>
                    <Form.Item name="receivedAt" label="Received on">
                      <DatePicker showTime style={{ width: "100%" }} />
                    </Form.Item>
                  </FormSection>

                  <FormSection icon={<FileProtectOutlined />} iconColor="#8c8c8c" title="Internal notes" description="Visible only to your team">
                    <FormSectionFullWidth>
                      <Form.Item name="internalNotes" label="Internal Notes">
                        <Input.TextArea rows={2} />
                      </Form.Item>
                    </FormSectionFullWidth>
                    <Form.Item name="rmRemark" label="RM Remark">
                      <Input.TextArea rows={2} />
                    </Form.Item>
                    <Form.Item name="lgRemark" label="LG Remark">
                      <Input.TextArea rows={2} />
                    </Form.Item>
                  </FormSection>
                </>
              ),
            },
            {
              key: "store",
              label: "Store",
              children: (
                <>
                  <FormSection icon={<ShopOutlined />} iconColor="#e34948" title="Store location" description="Where the outlet will run">
                    <Form.Item name="hasStoreLocation" label="Store Location">
                      <Select options={YES_NO} allowClear />
                    </Form.Item>
                    <Form.Item name="storeName" label="Store Name">
                      <Input />
                    </Form.Item>
                    <Form.Item name="storeAddress" label="Store address">
                      <Input />
                    </Form.Item>
                    <Form.Item name="storePincode" label="Store pin code">
                      <Input />
                    </Form.Item>
                    <Form.Item name="storeCity" label="Store city">
                      <Input />
                    </Form.Item>
                    <Form.Item name="storeState" label="Store state">
                      <Input />
                    </Form.Item>
                  </FormSection>

                  <FormSection icon={<HomeOutlined />} iconColor="#0ca30c" title="Premises" description="Site facts used for approval">
                    <Form.Item name="carpetArea" label="Carpet area">
                      <Input placeholder="e.g. 620 sq ft" />
                    </Form.Item>
                    <Form.Item name="frontage" label="Frontage">
                      <Input placeholder="e.g. 18 ft" />
                    </Form.Item>
                    <Form.Item name="ownership" label="Ownership">
                      <Select allowClear options={["Leased", "Owned"].map((value) => ({ value, label: value }))} />
                    </Form.Item>
                    <Form.Item name="investmentCapacity" label="Investment capacity">
                      <InputNumber style={{ width: "100%" }} min={0} prefix="₹" />
                    </Form.Item>
                    <Form.Item name="existingBusiness" label="Existing business">
                      <Input />
                    </Form.Item>
                    <Form.Item name="expectedOpening" label="Expected opening">
                      <DatePicker style={{ width: "100%" }} />
                    </Form.Item>
                  </FormSection>

                  <FormSection
                    icon={<SafetyCertificateOutlined />}
                    iconColor="#7248b8"
                    title="Compliance & business"
                    description="Only needed for FOFO franchise applications"
                  >
                    <Form.Item name="gstNumber" label="GST number">
                      <Input />
                    </Form.Item>
                    <Form.Item name="panNumber" label="PAN">
                      <Input />
                    </Form.Item>
                    <Form.Item name="drugLicenceNumber" label="Drug licence number">
                      <Input />
                    </Form.Item>
                    <Form.Item name="fssaiNumber" label="FSSAI number">
                      <Input />
                    </Form.Item>
                  </FormSection>
                </>
              ),
            },
            {
              key: "consent",
              label: "Consent",
              children: isEdit ? (
                <ConsentTab leadId={lead.id} />
              ) : (
                <FormSection
                  icon={<IdcardOutlined />}
                  iconColor="#0ca30c"
                  title="Consent (DPDP)"
                  description="Record how and when this lead consented to being contacted"
                >
                  <Form.Item name="consentCaptured" label="Consent captured">
                    <Select options={YES_NO} allowClear />
                  </Form.Item>
                  <Form.Item name="consentMethod" label="Method">
                    <Select
                      allowClear
                      options={["web form", "email", "whatsapp", "sms", "already captured"].map((value) => ({ value, label: value }))}
                    />
                  </Form.Item>
                  <Form.Item name="consentPurposes" label="Purposes">
                    <Input placeholder="e.g. Calls, WhatsApp, email" />
                  </Form.Item>
                  <Form.Item name="consentEvidenceRef" label="Consent evidence">
                    <Input placeholder="e.g. form-submission-4471.json" />
                  </Form.Item>
                  <FormSectionFullWidth>
                    <Form.Item name="consentNotes" label="Notes">
                      <Input.TextArea rows={2} />
                    </Form.Item>
                  </FormSectionFullWidth>
                </FormSection>
              ),
            },
          ]}
        />
      </Form>
    </Drawer>
  );
}
