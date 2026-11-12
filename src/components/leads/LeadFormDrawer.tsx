import { useEffect, useState } from "react";
import { Button, DatePicker, Drawer, Form, Input, InputNumber, Select, Space, Tabs, Typography, message } from "antd";
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
import * as salesTeamApi from "../../api/sales-team-api";
import * as userApi from "../../api/user-api";
import type { CreateLeadPayload, Lead } from "../../types/lead";
import type { State } from "../../types/sales-team";
import type { TeamMember } from "../../types/user";
import { usePipelineStages } from "../../hooks/use-pipeline-stages";
import { useLeadCategories } from "../../hooks/use-lead-categories";
import { useLeadInquiryOptions } from "../../hooks/use-lead-inquiry-options";
import { errorMessageFrom, fieldErrorsFrom } from "../../utils/api-error";
import { suggestEmailDomainFix } from "../../utils/email-typo-check";
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
  status?: string;
  prospectStatus?: string;
  category?: string;
  leadScore?: number;
  ownerId?: string;

  phone?: string;
  altPhone?: string;
  email?: string;
  website?: string;
  preferredLanguage?: string;
  pincode?: string;
  stateId?: string;
  addressLine1?: string;
  addressLine2?: string;
  territory?: string;

  companyName?: string;
  source?: string;
  inquiryCategory?: string;
  inquiryCategoryOther?: string;
  inquirySource?: string;
  inquirySourceOther?: string;
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
  carpetArea?: number;
  frontage?: number;
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

// Sentinel for "pick from the list" vs "type your own" in the Inquiry
// Category/Source selects - never sent to the backend, handleSubmit resolves
// it to the real typed value first (see OTHER_VALUE usages below).
const OTHER_VALUE = "__other__";

// Wizard step order - "Save & Next" walks forward through these, validating
// only the tab being left; "Save lead" (the real submit) only ever lives on
// the last one. Matches the Tabs `items` key order below exactly.
const TAB_KEYS = ["customer", "contact", "inquiry", "store", "consent"] as const;
type TabKey = (typeof TAB_KEYS)[number];

// Every Form.Item name that lives on each tab, so "Save & Next" can validate
// just that tab's own fields (not the whole form), and so a validation error
// - whichever tab it's actually on - can be routed back to the right pane.
const TAB_FIELDS: Record<TabKey, (keyof FormValues)[]> = {
  customer: ["fullName", "contactName", "profession", "startDate", "qualifiedPerson", "financialStatus", "status", "prospectStatus", "category", "leadScore", "ownerId"],
  contact: ["phone", "altPhone", "email", "website", "preferredLanguage", "pincode", "stateId", "territory", "addressLine1", "addressLine2"],
  inquiry: ["captureChannel", "companyName", "expectedValue", "inquiryCategory", "inquiryCategoryOther", "inquirySource", "inquirySourceOther", "utmTags", "receivedAt", "internalNotes", "rmRemark", "lgRemark"],
  store: ["hasStoreLocation", "storeName", "storeAddress", "storePincode", "storeCity", "storeState", "carpetArea", "frontage", "ownership", "investmentCapacity", "existingBusiness", "expectedOpening", "gstNumber", "panNumber", "drugLicenceNumber", "fssaiNumber"],
  consent: ["consentCaptured", "consentMethod", "consentPurposes", "consentEvidenceRef", "consentNotes"],
};

const FIELD_TO_TAB = new Map<string, TabKey>();
for (const tab of TAB_KEYS) {
  for (const field of TAB_FIELDS[tab]) {
    FIELD_TO_TAB.set(field, tab);
  }
}

export function LeadFormDrawer({ open, lead, onClose, onSaved }: LeadFormDrawerProps) {
  const { stages } = usePipelineStages();
  const { categories } = useLeadCategories();
  const { categoryOptions, sourceOptions, loading: inquiryOptionsLoading } = useLeadInquiryOptions();
  const [form] = Form.useForm<FormValues>();
  const [submitting, setSubmitting] = useState<"save" | "saveAndAddAnother" | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("customer");
  const isEdit = lead !== null;
  const emailValue = Form.useWatch("email", form);
  const emailSuggestion = emailValue ? suggestEmailDomainFix(emailValue) : null;
  // Exact email string the user explicitly said to keep despite the typo
  // nudge below - blocks Save/Save & Next for every OTHER typo'd address,
  // but never locks someone out of a domain they really did mean.
  const [confirmedTypoEmail, setConfirmedTypoEmail] = useState<string | null>(null);

  // Flat list, not region-filtered - the state itself (not which zone it's
  // in) is what assignment_rules actually matches a new lead's owner
  // against, so there's no reason to make a person pick a region first.
  const [states, setStates] = useState<State[]>([]);
  useEffect(() => {
    if (!open) return;
    salesTeamApi.listStates().then(setStates).catch(() => setStates([]));
  }, [open]);


  // Create-only (see the "Assign to Call Center Executive" field below) -
  // not worth fetching on every open of an edit drawer, where it's unused.
  const [callCenterUsers, setCallCenterUsers] = useState<TeamMember[]>([]);
  useEffect(() => {
    if (!open || isEdit) return;
    userApi
      .listUsers()
      .then((users) => setCallCenterUsers(users.filter((u) => u.role === "call_center" && u.isActive)))
      .catch(() => setCallCenterUsers([]));
  }, [open, isEdit]);

  useEffect(() => {
    if (!open) return;
    setActiveTab("customer");

    if (lead) {
      form.setFieldsValue({
        fullName: lead.fullName,
        contactName: lead.contactName ?? undefined,
        profession: lead.profession ?? undefined,
        startDate: lead.startDate ? dayjs(lead.startDate) : undefined,
        qualifiedPerson: lead.qualifiedPerson ?? undefined,
        financialStatus: lead.financialStatus ?? undefined,
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
        stateId: lead.stateId ?? undefined,
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

  // Inquiry Category/Source now come from an admin-editable list (manual-
  // entry leads only) instead of being pure free text - a lead's existing
  // value might predate the list or just not be on it, so that case falls
  // back to "Other" with the real value pre-filled in the text box rather
  // than silently showing nothing or forcing a destructive reset. Waits on
  // inquiryOptionsLoading so this doesn't fire (and flash "Other") before
  // the real options have even loaded once.
  useEffect(() => {
    if (!open || inquiryOptionsLoading) return;
    if (!lead) {
      form.setFieldsValue({ inquiryCategory: undefined, inquiryCategoryOther: undefined, inquirySource: undefined, inquirySourceOther: undefined });
      return;
    }
    const categoryKnown = !lead.inquiryCategory || categoryOptions.some((o) => o.label === lead.inquiryCategory);
    const sourceKnown = !lead.inquirySource || sourceOptions.some((o) => o.label === lead.inquirySource);
    form.setFieldsValue({
      inquiryCategory: categoryKnown ? lead.inquiryCategory ?? undefined : OTHER_VALUE,
      inquiryCategoryOther: categoryKnown ? undefined : lead.inquiryCategory ?? undefined,
      inquirySource: sourceKnown ? lead.inquirySource ?? undefined : OTHER_VALUE,
      inquirySourceOther: sourceKnown ? undefined : lead.inquirySource ?? undefined,
    });
  }, [open, lead, inquiryOptionsLoading, categoryOptions, sourceOptions, form]);

  const handleSubmit = async (values: FormValues, mode: "save" | "saveAndAddAnother") => {
    setSubmitting(mode);

    const payload: Partial<CreateLeadPayload> = {
      fullName: values.fullName,
      contactName: values.contactName,
      profession: values.profession,
      startDate: values.startDate?.toISOString(),
      qualifiedPerson: values.qualifiedPerson,
      financialStatus: values.financialStatus,
      status: values.status,
      prospectStatus: values.prospectStatus,
      category: values.category,
      leadScore: values.leadScore,
      // Create-only - reassigning an existing lead goes through Reassign/
      // Pick up this lead instead, never a plain edit-and-save.
      ownerId: isEdit ? undefined : values.ownerId,
      phone: values.phone,
      altPhone: values.altPhone,
      email: values.email,
      website: values.website,
      preferredLanguage: values.preferredLanguage,
      pincode: values.pincode,
      stateId: values.stateId,
      addressLine1: values.addressLine1,
      addressLine2: values.addressLine2,
      territory: values.territory,
      companyName: values.companyName,
      source: values.source,
      inquiryCategory: values.inquiryCategory === OTHER_VALUE ? values.inquiryCategoryOther?.trim() : values.inquiryCategory,
      inquirySource: values.inquirySource === OTHER_VALUE ? values.inquirySourceOther?.trim() : values.inquirySource,
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
      // validate-middleware.ts's own 422 already carries which field(s) are
      // wrong (zod's flattened fieldErrors) - route straight to the first
      // one instead of leaving the user with just a generic toast and no
      // idea where to look.
      const backendErrors = fieldErrorsFrom(err);
      const firstEntry = backendErrors ? Object.entries(backendErrors)[0] : undefined;
      if (firstEntry) {
        const [firstField, firstMessages] = firstEntry;
        form.setFields(Object.entries(backendErrors!).map(([name, errors]) => ({ name: name as keyof FormValues, errors })));
        goToFieldsOwningTab(firstField);
        message.error(firstMessages[0] ?? "Failed to save lead");
      } else {
        message.error(errorMessageFrom(err, "Failed to save lead"));
      }
    } finally {
      setSubmitting(null);
    }
  };

  // Switches to whichever tab owns this field name, then scrolls/focuses it
  // once that pane has actually mounted - Tabs here keeps inactive panes
  // mounted but hidden (display:none, not unmounted), so scrolling has to
  // happen a tick after the switch, not in the same render.
  const goToFieldsOwningTab = (fieldName: string) => {
    const tab = FIELD_TO_TAB.get(fieldName);
    if (!tab) return;
    setActiveTab(tab);
    setTimeout(() => form.scrollToField(fieldName, { behavior: "smooth", block: "center" }), 50);
  };

  const handleSaveLead = async (mode: "save" | "saveAndAddAnother") => {
    let values: FormValues;
    try {
      values = await form.validateFields();
    } catch (err) {
      // antd's own client-side rejection - fields on the active tab already
      // show their red error text as a side effect of validateFields() above;
      // this just covers the case where the first invalid field is on a
      // DIFFERENT (hidden) tab, which would otherwise show nothing at all.
      const errorFields = (err as { errorFields?: { name: (string | number)[]; errors: string[] }[] }).errorFields;
      const first = errorFields?.[0];
      if (first) {
        const fieldName = String(first.name[0]);
        goToFieldsOwningTab(fieldName);
      }
      return;
    }
    await handleSubmit(values, mode);
  };

  const handleSaveAndNext = async () => {
    try {
      await form.validateFields(TAB_FIELDS[activeTab]);
    } catch {
      return; // Invalid fields are on this same (already visible) tab.
    }
    const nextIndex = TAB_KEYS.indexOf(activeTab) + 1;
    if (nextIndex < TAB_KEYS.length) {
      setActiveTab(TAB_KEYS[nextIndex]);
    }
  };

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
          {activeTab !== "consent" ? (
            <Button type="primary" onClick={handleSaveAndNext}>
              Save & Next
            </Button>
          ) : (
            <>
              {!isEdit && (
                <Button
                  loading={submitting === "saveAndAddAnother"}
                  disabled={submitting === "save"}
                  onClick={() => handleSaveLead("saveAndAddAnother")}
                >
                  Save & add another
                </Button>
              )}
              <Button
                type="primary"
                loading={submitting === "save"}
                disabled={submitting === "saveAndAddAnother"}
                onClick={() => handleSaveLead("save")}
              >
                Save lead
              </Button>
            </>
          )}
        </Space>
      }
    >
      <Form form={form} layout="vertical">
        <Tabs
          activeKey={activeTab}
          onChange={(key) => setActiveTab(key as TabKey)}
          items={[
            {
              key: "customer",
              label: "Customer",
              children: (
                <>
                  <FormSection
                    icon={<UserOutlined />}
                    iconColor="#1677ff"
                    title="Customer information"
                    description="Who the franchise applicant is"
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
                  >
                    <Form.Item name="status" label="Status">
                      <Select
                        allowClear
                        options={stages.filter((s) => s.isActive).map((s) => ({ value: s.key, label: s.label }))}
                      />
                    </Form.Item>
                    <Form.Item name="prospectStatus" label="Prospect Status">
                      <Select allowClear options={["Hot", "Warm", "Cold"].map((value) => ({ value, label: value }))} />
                    </Form.Item>
                    <Form.Item name="category" label="Category">
                      <Select
                        allowClear
                        placeholder="Optional"
                        options={categories.filter((c) => c.isActive).map((c) => ({ value: c.key, label: c.label }))}
                      />
                    </Form.Item>
                    <Form.Item name="leadScore" label="Lead Score (%)">
                      <InputNumber min={0} max={100} style={{ width: "100%" }} />
                    </Form.Item>
                    {/* Create-only - purely a starting owner, never an access
                        gate: every Call Center Executive can see and work
                        this lead regardless of who it's assigned to (same as
                        the bulk import's own "Call Center Executive" column).
                        Left blank, it falls back to the normal round robin.
                        Not shown on edit - reassigning an existing lead goes
                        through Reassign/Pick up this lead instead. */}
                    {!isEdit && (
                      <Form.Item name="ownerId" label="Assign to Call Center Executive" tooltip="Optional - leave blank to auto-assign via round robin. Visible to every Call Center Executive either way.">
                        <Select
                          allowClear
                          showSearch
                          placeholder="Auto-assign (round robin)"
                          optionFilterProp="label"
                          options={callCenterUsers.map((u) => ({ value: u.id, label: `${u.name} (${u.email})` }))}
                        />
                      </Form.Item>
                    )}
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
                    <Form.Item
                      name="phone"
                      label="Phone Number"
                      rules={[
                        { pattern: /^\d{10}$/, message: "Enter a 10-digit mobile number" },
                        // Required on both create and edit, matching the
                        // backend (updateLeadSchema re-applies this after its
                        // own .partial()) - a client decision: an older lead
                        // saved before this rule existed must get a real
                        // phone number added the next time anyone edits it.
                        { required: true, message: "Phone number is required" },
                      ]}
                    >
                      <Input maxLength={10} />
                    </Form.Item>
                    <Form.Item
                      name="altPhone"
                      label="Alternative Mobile Number"
                      rules={[{ pattern: /^\d{10}$/, message: "Enter a 10-digit mobile number" }]}
                    >
                      <Input maxLength={10} />
                    </Form.Item>
                    <Form.Item
                      name="email"
                      label="Email address"
                      rules={[
                        { type: "email", message: "Invalid email" },
                        // A likely-typo'd domain (gmail.co, gmial.com, etc.)
                        // blocks Save/Save & Next, same as any other invalid
                        // field - unless this exact value is the one the user
                        // just explicitly said to keep via the link below.
                        {
                          validator: (_, value: string | undefined) => {
                            const suggestion = value ? suggestEmailDomainFix(value) : null;
                            if (!suggestion || value === confirmedTypoEmail) return Promise.resolve();
                            return Promise.reject(new Error(`Did you mean ${suggestion}?`));
                          },
                        },
                      ]}
                      extra={
                        emailSuggestion && emailValue !== confirmedTypoEmail ? (
                          <Text type="warning" style={{ fontSize: 12 }}>
                            Did you mean <a onClick={() => form.setFieldValue("email", emailSuggestion)}>{emailSuggestion}</a>? Or{" "}
                            <a
                              onClick={() => {
                                setConfirmedTypoEmail(emailValue ?? null);
                                form.validateFields(["email"]);
                              }}
                            >
                              keep {emailValue} as typed
                            </a>
                            .
                          </Text>
                        ) : undefined
                      }
                    >
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
                    <Form.Item name="pincode" label="PinCode" rules={[{ pattern: /^\d{6}$/, message: "Enter a valid 6-digit pincode" }]}>
                      <Input maxLength={6} />
                    </Form.Item>
                    <Form.Item
                      name="stateId"
                      label="State"
                      tooltip="Drives automatic owner assignment for new leads (Settings > Assignment rules)"
                    >
                      <Select
                        allowClear
                        showSearch
                        optionFilterProp="label"
                        placeholder="Select a state"
                        options={states.map((s) => ({ value: s.id, label: s.name }))}
                      />
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
                    title="How this lead arrived"
                    description="Which channel brought this lead in"
                  >
                    <FormSectionFullWidth>
                      <Form.Item name="captureChannel" label="Capture channel">
                        <Select allowClear options={CAPTURE_CHANNEL_OPTIONS} />
                      </Form.Item>
                    </FormSectionFullWidth>
                  </FormSection>

                  <FormSection icon={<BankOutlined />} iconColor="#1677ff" title="Inquiry details" description="Category and source of the enquiry">
                    <Form.Item name="companyName" label="Company name">
                      <Input />
                    </Form.Item>
                    <Form.Item name="expectedValue" label="Expected value">
                      <InputNumber style={{ width: "100%" }} min={0} prefix="₹" />
                    </Form.Item>
                    <Form.Item name="inquiryCategory" label="Inquiry Category">
                      <Select
                        allowClear
                        placeholder="Optional"
                        options={[
                          ...categoryOptions.filter((o) => o.isActive).map((o) => ({ value: o.label, label: o.label })),
                          { value: OTHER_VALUE, label: "Other" },
                        ]}
                      />
                    </Form.Item>
                    <Form.Item noStyle shouldUpdate={(prev, cur) => prev.inquiryCategory !== cur.inquiryCategory}>
                      {({ getFieldValue }) =>
                        getFieldValue("inquiryCategory") === OTHER_VALUE && (
                          <Form.Item name="inquiryCategoryOther" label="Inquiry Category (specify)">
                            <Input placeholder="Type the category" />
                          </Form.Item>
                        )
                      }
                    </Form.Item>
                    <Form.Item name="inquirySource" label="Inquiry Source">
                      <Select
                        allowClear
                        placeholder="Optional"
                        options={[
                          ...sourceOptions.filter((o) => o.isActive).map((o) => ({ value: o.label, label: o.label })),
                          { value: OTHER_VALUE, label: "Other" },
                        ]}
                      />
                    </Form.Item>
                    <Form.Item noStyle shouldUpdate={(prev, cur) => prev.inquirySource !== cur.inquirySource}>
                      {({ getFieldValue }) =>
                        getFieldValue("inquirySource") === OTHER_VALUE && (
                          <Form.Item name="inquirySourceOther" label="Inquiry Source (specify)">
                            <Input placeholder="e.g. Instagram, Referral, Walk-in" />
                          </Form.Item>
                        )
                      }
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
                    <Form.Item
                      name="storePincode"
                      label="Store pin code"
                      rules={[{ pattern: /^\d{6}$/, message: "Enter a valid 6-digit pincode" }]}
                    >
                      <Input maxLength={6} />
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
                      <InputNumber style={{ width: "100%" }} min={0} suffix="sq ft" placeholder="e.g. 620" />
                    </Form.Item>
                    <Form.Item name="frontage" label="Frontage">
                      <InputNumber style={{ width: "100%" }} min={0} suffix="ft" placeholder="e.g. 18" />
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
                      <DatePicker style={{ width: "100%" }} format="D MMM YYYY" disabledDate={(d) => d.isBefore(dayjs(), "day")} />
                    </Form.Item>
                  </FormSection>

                  <FormSection
                    icon={<SafetyCertificateOutlined />}
                    iconColor="#7248b8"
                    title="Compliance & business"
                    description="Only needed for FOFO franchise applications"
                  >
                    <Form.Item
                      name="gstNumber"
                      label="GST number"
                      rules={[{ pattern: /^\d{2}[A-Za-z]{5}\d{4}[A-Za-z][A-Za-z0-9][Zz][A-Za-z0-9]$/, message: "Enter a valid GSTIN" }]}
                      normalize={(value: string) => value?.toUpperCase()}
                    >
                      <Input placeholder="22AAAAA0000A1Z5" maxLength={15} />
                    </Form.Item>
                    <Form.Item
                      name="panNumber"
                      label="PAN"
                      rules={[{ pattern: /^[A-Za-z]{5}[0-9]{4}[A-Za-z]$/, message: "Enter a valid PAN (e.g. ABCDE1234F)" }]}
                      normalize={(value: string) => value?.toUpperCase()}
                    >
                      <Input placeholder="ABCDE1234F" maxLength={10} />
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
