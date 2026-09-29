import { useEffect, useState } from "react";
import { Button, DatePicker, Input, Modal, Select, Switch, Typography, message } from "antd";
import { QrcodeOutlined } from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";
import * as qrCampaignApi from "../../api/qr-campaign-api";
import * as userApi from "../../api/user-api";
import { useLeadCategories } from "../../hooks/use-lead-categories";
import type { QrCampaign } from "../../types/qr-campaign";
import type { TeamMember } from "../../types/user";
import { errorMessageFrom } from "../../utils/api-error";
import { appTokens } from "../../utils/design-system";

const { Text, Title } = Typography;
const AUTO_ASSIGN = "__auto__";

interface GenerateQrCampaignModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  /** null means "create a new one" */
  campaign: QrCampaign | null;
}

export function GenerateQrCampaignModal({ open, onClose, onSaved, campaign }: GenerateQrCampaignModalProps) {
  const isNew = campaign === null;
  const { categories } = useLeadCategories();
  const [users, setUsers] = useState<TeamMember[]>([]);
  const [name, setName] = useState("");
  const [placement, setPlacement] = useState("");
  const [defaultCategory, setDefaultCategory] = useState<string | undefined>();
  const [assignTo, setAssignTo] = useState<string>(AUTO_ASSIGN);
  const [utmTags, setUtmTags] = useState("");
  const [expiresAt, setExpiresAt] = useState<Dayjs | null>(null);
  const [requireConsent, setRequireConsent] = useState(true);
  const [captureScanLocation, setCaptureScanLocation] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(campaign?.name ?? "");
    setPlacement(campaign?.placement ?? "");
    setDefaultCategory(campaign?.defaultCategory ?? undefined);
    setAssignTo(campaign?.defaultOwnerId ?? AUTO_ASSIGN);
    setUtmTags(campaign?.utmTags ?? "");
    setExpiresAt(campaign?.expiresAt ? dayjs(campaign.expiresAt) : null);
    setRequireConsent(campaign?.requireConsent ?? true);
    setCaptureScanLocation(campaign?.captureScanLocation ?? true);
    userApi.listUsers().then(setUsers).catch(() => undefined);
  }, [open, campaign]);

  const canSave = name.trim().length > 0 && defaultCategory !== undefined;

  const handleSave = async () => {
    if (!defaultCategory) return;
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        placement: placement.trim() || undefined,
        defaultCategory,
        defaultOwnerId: assignTo === AUTO_ASSIGN ? null : assignTo,
        utmTags: utmTags.trim() || undefined,
        expiresAt: expiresAt ? expiresAt.toISOString() : null,
        requireConsent,
        captureScanLocation,
      };
      if (isNew) {
        await qrCampaignApi.createQrCampaign(payload);
        message.success("QR code generated");
      } else {
        await qrCampaignApi.updateQrCampaign(campaign.id, payload);
        message.success("QR code updated");
      }
      onSaved();
    } catch (err) {
      message.error(errorMessageFrom(err, "Failed to save this QR code"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      width={480}
      style={{ top: 0 }}
      styles={{ body: { maxHeight: "calc(100vh - 180px)", overflowY: "auto", paddingRight: 4 } }}
      title={
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: appTokens.radiusSm,
              background: appTokens.primarySoft,
              color: appTokens.primary,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <QrcodeOutlined />
          </div>
          <Title level={5} style={{ margin: 0 }}>
            {isNew ? "Generate QR code" : `Edit ${campaign.name}`}
          </Title>
        </div>
      }
      footer={
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="primary" loading={saving} disabled={!canSave} onClick={handleSave}>
            {isNew ? "Create QR code" : "Save changes"}
          </Button>
        </div>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 6 }}>
        <div>
          <Text style={{ fontSize: 12.5, fontWeight: 500 }}>
            Campaign name <span style={{ color: appTokens.danger }}>*</span>
          </Text>
          <Input style={{ marginTop: 4 }} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Store window — Kothrud" />
        </div>
        <div>
          <Text style={{ fontSize: 12.5, fontWeight: 500 }}>Where it will appear</Text>
          <Input style={{ marginTop: 4 }} value={placement} onChange={(e) => setPlacement(e.target.value)} placeholder="Decal, standee, insert, visiting card" />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <Text style={{ fontSize: 12.5, fontWeight: 500 }}>UTM tags</Text>
            <Input style={{ marginTop: 4 }} value={utmTags} onChange={(e) => setUtmTags(e.target.value)} placeholder="qr/print/..." />
          </div>
          <div>
            <Text style={{ fontSize: 12.5, fontWeight: 500 }}>Expiry</Text>
            <DatePicker
              style={{ width: "100%", marginTop: 4 }}
              value={expiresAt}
              onChange={setExpiresAt}
              placeholder="No expiry"
            />
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <Text style={{ fontSize: 12.5, fontWeight: 500 }}>
              Default category <span style={{ color: appTokens.danger }}>*</span>
            </Text>
            <Select
              style={{ width: "100%", marginTop: 4 }}
              value={defaultCategory}
              onChange={setDefaultCategory}
              placeholder="Select"
              options={categories.filter((c) => c.isActive).map((c) => ({ value: c.key, label: c.label }))}
            />
          </div>
          <div>
            <Text style={{ fontSize: 12.5, fontWeight: 500 }}>Assign leads to</Text>
            <Select
              style={{ width: "100%", marginTop: 4 }}
              value={assignTo}
              onChange={setAssignTo}
              showSearch
              optionFilterProp="label"
              options={[{ value: AUTO_ASSIGN, label: "Auto — by rule" }, ...users.map((u) => ({ value: u.id, label: u.name }))]}
            />
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <Text style={{ fontSize: 13, fontWeight: 500 }}>Require DPDP consent to submit</Text>
            <div>
              <Text style={{ fontSize: 11, color: appTokens.textTertiary }}>Consent is stored with the lead, real timestamp and purpose</Text>
            </div>
          </div>
          <Switch checked={requireConsent} onChange={setRequireConsent} />
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <Text style={{ fontSize: 13, fontWeight: 500 }}>Capture scan location</Text>
            <div>
              <Text style={{ fontSize: 11, color: appTokens.textTertiary }}>IP-based city, used only to prefill the form - never exact</Text>
            </div>
          </div>
          <Switch checked={captureScanLocation} onChange={setCaptureScanLocation} />
        </div>
        <div>
          <Text style={{ fontSize: 11, color: appTokens.textTertiary }}>
            The printed code always points to this campaign - changing any setting here takes effect immediately, without reprinting.
          </Text>
        </div>
      </div>
    </Modal>
  );
}
