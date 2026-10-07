import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Button, Checkbox, Input, InputNumber, Select, Spin, Typography, Upload, message } from "antd";
import { CheckCircleFilled, InboxOutlined, ThunderboltFilled } from "@ant-design/icons";
import type { UploadFile } from "antd/es/upload/interface";
import * as publicQrApi from "../api/public-qr-api";
import type { PublicQrCampaignInfo } from "../types/qr-campaign";
import { errorMessageFrom } from "../utils/api-error";
import { appTokens } from "../utils/design-system";

const { Title, Text } = Typography;

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        padding: 16,
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
        paddingTop: "8vh",
        background: appTokens.surfaceSunken,
        fontFamily: appTokens.font,
      }}
    >
      <div style={{ width: "100%", maxWidth: 420 }}>
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: `linear-gradient(135deg, ${appTokens.primary}, #3f6fef)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 10px",
              boxShadow: "0 10px 28px rgba(19,84,224,0.3)",
            }}
          >
            <ThunderboltFilled style={{ color: "#fff", fontSize: 20 }} />
          </div>
          <Title level={4} style={{ margin: 0, letterSpacing: -0.3 }}>
            FieldForce
          </Title>
        </div>
        <div
          style={{
            background: appTokens.surface,
            border: `1px solid ${appTokens.border}`,
            borderRadius: appTokens.radiusLg,
            boxShadow: appTokens.shadowLg,
            padding: 24,
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

const INACTIVE_COPY: Record<string, string> = {
  not_found: "This QR code isn't recognized. Please check the link or ask for a new code.",
  paused: "This code isn't accepting submissions right now.",
  expired: "This code has expired.",
};

export default function QrCapturePage() {
  const { code } = useParams<{ code: string }>();
  const [info, setInfo] = useState<PublicQrCampaignInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState<{ leadNumber: number | null } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [cityOrPincode, setCityOrPincode] = useState("");
  const [stateId, setStateId] = useState<string | undefined>(undefined);
  const [investmentCapacity, setInvestmentCapacity] = useState<number | null>(null);
  const [existingStore, setExistingStore] = useState(false);
  const [preferredLanguage, setPreferredLanguage] = useState("");
  const [consentGranted, setConsentGranted] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | undefined>();

  useEffect(() => {
    if (!code) return;
    publicQrApi
      .getPublicQrCampaign(code)
      .then((res) => {
        setInfo(res);
        if (res.resolvedCity) setCityOrPincode(res.resolvedCity);
        if (res.resolvedStateId) setStateId(res.resolvedStateId);
      })
      .catch(() => setInfo({ active: false, reason: "not_found" }))
      .finally(() => setLoading(false));
  }, [code]);

  const canSubmit =
    fullName.trim().length > 0 &&
    phone.trim().length >= 6 &&
    cityOrPincode.trim().length > 0 &&
    Boolean(stateId) &&
    (!info?.requireConsent || consentGranted);

  const handleSubmit = async () => {
    if (!code || !canSubmit) return;
    setSubmitting(true);
    try {
      const result = await publicQrApi.submitPublicQrCapture(code, {
        fullName: fullName.trim(),
        phone: phone.trim(),
        cityOrPincode: cityOrPincode.trim(),
        stateId,
        email: info?.fieldConfig?.email ? email.trim() || undefined : undefined,
        investmentCapacity: info?.fieldConfig?.investmentCapacity ? investmentCapacity ?? undefined : undefined,
        existingStore: info?.fieldConfig?.existingStore ? existingStore : undefined,
        preferredLanguage: info?.fieldConfig?.preferredLanguage ? preferredLanguage.trim() || undefined : undefined,
        consentGranted,
        photo: info?.fieldConfig?.photo ? photoFile : undefined,
      });
      setSubmitted(result);
    } catch (err) {
      message.error(errorMessageFrom(err, "Couldn't submit - please try again"));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Shell>
        <div style={{ textAlign: "center", padding: "24px 0" }}>
          <Spin />
        </div>
      </Shell>
    );
  }

  if (!info?.active) {
    return (
      <Shell>
        <div style={{ textAlign: "center", padding: "16px 0" }}>
          <Text style={{ fontSize: 14, color: appTokens.textSecondary }}>
            {INACTIVE_COPY[info?.reason ?? "not_found"]}
          </Text>
        </div>
      </Shell>
    );
  }

  if (submitted) {
    return (
      <Shell>
        <div style={{ textAlign: "center", padding: "16px 0" }}>
          <CheckCircleFilled style={{ fontSize: 36, color: appTokens.success }} />
          <Title level={5} style={{ marginTop: 12, marginBottom: 4 }}>
            Thanks, {fullName.split(" ")[0]}!
          </Title>
          <Text style={{ fontSize: 13, color: appTokens.textSecondary }}>
            We've got your details{submitted.leadNumber ? ` (reference #${submitted.leadNumber})` : ""}. Our team will reach out soon.
          </Text>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <Title level={5} style={{ margin: 0 }}>
        {info.name}
      </Title>
      {info.categoryLabel && (
        <Text style={{ fontSize: 12.5, color: appTokens.textTertiary }}>Enquiring about: {info.categoryLabel}</Text>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 18 }}>
        <div>
          <Text style={{ fontSize: 12.5, fontWeight: 500 }}>
            Full name <span style={{ color: appTokens.danger }}>*</span>
          </Text>
          <Input style={{ marginTop: 4 }} size="large" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>
        <div>
          <Text style={{ fontSize: 12.5, fontWeight: 500 }}>
            Mobile number <span style={{ color: appTokens.danger }}>*</span>
          </Text>
          <Input style={{ marginTop: 4 }} size="large" value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" />
        </div>
        {info.fieldConfig?.email && (
          <div>
            <Text style={{ fontSize: 12.5, fontWeight: 500 }}>Email</Text>
            <Input style={{ marginTop: 4 }} size="large" value={email} onChange={(e) => setEmail(e.target.value)} inputMode="email" />
          </div>
        )}
        <div>
          <Text style={{ fontSize: 12.5, fontWeight: 500 }}>
            City / pin code <span style={{ color: appTokens.danger }}>*</span>
          </Text>
          <Input style={{ marginTop: 4 }} size="large" value={cityOrPincode} onChange={(e) => setCityOrPincode(e.target.value)} />
        </div>
        <div>
          <Text style={{ fontSize: 12.5, fontWeight: 500 }}>
            State <span style={{ color: appTokens.danger }}>*</span>
          </Text>
          <Select
            style={{ width: "100%", marginTop: 4 }}
            size="large"
            showSearch
            optionFilterProp="label"
            placeholder="Select your state"
            value={stateId}
            onChange={setStateId}
            options={(info.states ?? []).map((s) => ({ value: s.id, label: s.name }))}
          />
        </div>
        {info.fieldConfig?.investmentCapacity && (
          <div>
            <Text style={{ fontSize: 12.5, fontWeight: 500 }}>Investment capacity</Text>
            <InputNumber style={{ width: "100%", marginTop: 4 }} size="large" value={investmentCapacity} onChange={setInvestmentCapacity} />
          </div>
        )}
        {info.fieldConfig?.preferredLanguage && (
          <div>
            <Text style={{ fontSize: 12.5, fontWeight: 500 }}>Preferred language</Text>
            <Input style={{ marginTop: 4 }} size="large" value={preferredLanguage} onChange={(e) => setPreferredLanguage(e.target.value)} />
          </div>
        )}
        {info.fieldConfig?.existingStore && (
          <Checkbox checked={existingStore} onChange={(e) => setExistingStore(e.target.checked)}>
            I already run a store
          </Checkbox>
        )}
        {info.fieldConfig?.photo && (
          <div>
            <Text style={{ fontSize: 12.5, fontWeight: 500 }}>Photo of premises</Text>
            <Upload.Dragger
              style={{ marginTop: 4 }}
              maxCount={1}
              accept="image/*,.pdf"
              beforeUpload={(file) => {
                setPhotoFile(file);
                return false;
              }}
              onRemove={() => setPhotoFile(undefined)}
              fileList={photoFile ? ([{ uid: "1", name: photoFile.name, status: "done" }] as UploadFile[]) : []}
            >
              <p className="ant-upload-drag-icon">
                <InboxOutlined />
              </p>
              <p style={{ fontSize: 12.5 }}>Click or drag a photo here</p>
            </Upload.Dragger>
          </div>
        )}

        <Checkbox checked={consentGranted} onChange={(e) => setConsentGranted(e.target.checked)}>
          <Text style={{ fontSize: 12 }}>
            I agree to be contacted by phone, WhatsApp or email regarding this enquiry (DPDP consent){info.requireConsent ? " *" : ""}
          </Text>
        </Checkbox>

        <Button type="primary" size="large" block loading={submitting} disabled={!canSubmit} onClick={handleSubmit}>
          Submit
        </Button>
      </div>
    </Shell>
  );
}
