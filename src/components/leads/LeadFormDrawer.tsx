import { useEffect, useState } from "react";
import { Button, DatePicker, Drawer, Form, Input, InputNumber, Select, Space, Tabs, message } from "antd";
import dayjs from "dayjs";
import * as leadApi from "../../api/lead-api";
import type { CreateLeadPayload, Lead } from "../../types/lead";
import { ConsentTab } from "./tabs/ConsentTab";

interface LeadFormDrawerProps {
  open: boolean;
  lead: Lead | null;
  onClose: () => void;
  onSaved: (lead: Lead) => void;
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

export function LeadFormDrawer({ open, lead, onClose, onSaved }: LeadFormDrawerProps) {
  const [form] = Form.useForm<FormValues>();
  const [submitting, setSubmitting] = useState(false);
  const isEdit = lead !== null;

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

  const handleSubmit = async (values: FormValues) => {
    setSubmitting(true);

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
      message.success(isEdit ? "Lead updated" : "Lead created");
      onSaved(saved);
    } catch {
      message.error("Failed to save lead");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Drawer
      title={isEdit ? "Edit lead" : "New lead"}
      open={open}
      onClose={onClose}
      size={560}
      destroyOnHidden
      footer={
        <Space style={{ display: "flex", justifyContent: "flex-end", width: "100%" }}>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="primary" loading={submitting} onClick={() => form.submit()}>
            {isEdit ? "Save lead" : "Save lead"}
          </Button>
        </Space>
      }
    >
      <Form form={form} layout="vertical" onFinish={handleSubmit} requiredMark={false}>
        <Tabs
          items={[
            {
              key: "customer",
              label: "Customer",
              children: (
                <>
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
                  <Form.Item name="welcomeMessageSent" label="Welcome Message Sent">
                    <Select options={YES_NO} allowClear />
                  </Form.Item>
                  <Form.Item name="status" label="Status">
                    <Select
                      allowClear
                      options={["New", "Open", "Qualified", "Site visit", "Proposal", "Negotiation", "Agreement", "Converted", "Closed Lost"].map(
                        (value) => ({ value, label: value })
                      )}
                    />
                  </Form.Item>
                  <Form.Item name="prospectStatus" label="Prospect Status">
                    <Select allowClear options={["Hot", "Warm", "Cold"].map((value) => ({ value, label: value }))} />
                  </Form.Item>
                  <Form.Item name="category" label="Category" rules={[{ required: true, message: "Required" }]}>
                    <Select options={["FOFO", "Stockist", "B2B", "COCO", "Lifestyle"].map((value) => ({ value, label: value }))} />
                  </Form.Item>
                  <Form.Item name="leadScore" label="Lead Score (%)">
                    <InputNumber min={0} max={100} style={{ width: "100%" }} />
                  </Form.Item>
                </>
              ),
            },
            {
              key: "contact",
              label: "Contact",
              children: (
                <>
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
                  <Form.Item name="pincode" label="PinCode">
                    <Input />
                  </Form.Item>
                  <Form.Item name="addressLine1" label="Address line 1">
                    <Input />
                  </Form.Item>
                  <Form.Item name="addressLine2" label="Address line 2">
                    <Input />
                  </Form.Item>
                  <Form.Item name="territory" label="Territory">
                    <Input placeholder="e.g. AP South · Guntur" />
                  </Form.Item>
                </>
              ),
            },
            {
              key: "inquiry",
              label: "Inquiry",
              children: (
                <>
                  <Form.Item name="companyName" label="Company name">
                    <Input />
                  </Form.Item>
                  <Form.Item name="captureChannel" label="Capture channel">
                    <Select
                      allowClear
                      options={[
                        { value: "web_form", label: "Web form" },
                        { value: "qr_scan", label: "QR scan" },
                        { value: "whatsapp", label: "WhatsApp" },
                        { value: "call_centre", label: "Call centre" },
                        { value: "import", label: "Import" },
                        { value: "manual_entry", label: "Manual entry" },
                      ]}
                    />
                  </Form.Item>
                  <Form.Item name="inquiryCategory" label="Inquiry Category">
                    <Input />
                  </Form.Item>
                  <Form.Item name="inquirySource" label="Inquiry Source">
                    <Input />
                  </Form.Item>
                  <Form.Item name="utmTags" label="UTM / campaign tags">
                    <Input />
                  </Form.Item>
                  <Form.Item name="expectedValue" label="Expected value">
                    <InputNumber style={{ width: "100%" }} min={0} prefix="₹" />
                  </Form.Item>
                  <Form.Item name="receivedAt" label="Received on">
                    <DatePicker showTime style={{ width: "100%" }} />
                  </Form.Item>
                  <Form.Item name="internalNotes" label="Internal Notes">
                    <Input.TextArea rows={2} />
                  </Form.Item>
                  <Form.Item name="rmRemark" label="RM Remark">
                    <Input.TextArea rows={2} />
                  </Form.Item>
                  <Form.Item name="lgRemark" label="LG Remark">
                    <Input.TextArea rows={2} />
                  </Form.Item>
                </>
              ),
            },
            {
              key: "store",
              label: "Store",
              children: (
                <>
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
                </>
              ),
            },
            {
              key: "consent",
              label: "Consent",
              children: isEdit ? (
                <ConsentTab leadId={lead.id} />
              ) : (
                <>
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
                  <Form.Item name="consentNotes" label="Notes">
                    <Input.TextArea rows={2} />
                  </Form.Item>
                </>
              ),
            },
          ]}
        />
      </Form>
    </Drawer>
  );
}
