import { useEffect, useState } from "react";
import { Button, Input, Modal, Select, Switch, Typography, message } from "antd";
import { GlobalOutlined } from "@ant-design/icons";
import * as websiteLeadSourceApi from "../../api/website-lead-source-api";
import * as userApi from "../../api/user-api";
import { useLeadCategories } from "../../hooks/use-lead-categories";
import type { WebsiteLeadSource } from "../../types/website-lead-source";
import type { TeamMember } from "../../types/user";
import { errorMessageFrom } from "../../utils/api-error";
import { appTokens } from "../../utils/design-system";

const { Text, Title } = Typography;
const AUTO_ASSIGN = "__auto__";

interface AddWebsiteLeadSourceModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  /** null means "create a new one" */
  source: WebsiteLeadSource | null;
}

export function AddWebsiteLeadSourceModal({ open, onClose, onSaved, source }: AddWebsiteLeadSourceModalProps) {
  const isNew = source === null;
  const { categories } = useLeadCategories();
  const [users, setUsers] = useState<TeamMember[]>([]);
  const [name, setName] = useState("");
  const [allowedOrigin, setAllowedOrigin] = useState("");
  const [defaultCategory, setDefaultCategory] = useState<string | undefined>();
  const [assignTo, setAssignTo] = useState<string>(AUTO_ASSIGN);
  const [utmTags, setUtmTags] = useState("");
  const [requireConsent, setRequireConsent] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(source?.name ?? "");
    setAllowedOrigin(source?.allowedOrigin ?? "");
    setDefaultCategory(source?.defaultCategory ?? undefined);
    setAssignTo(source?.defaultOwnerId ?? AUTO_ASSIGN);
    setUtmTags(source?.utmTags ?? "");
    setRequireConsent(source?.requireConsent ?? true);
    userApi.listUsers().then(setUsers).catch(() => undefined);
  }, [open, source]);

  const canSave = name.trim().length > 0 && defaultCategory !== undefined;

  const handleSave = async () => {
    if (!defaultCategory) return;
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        allowedOrigin: allowedOrigin.trim() || undefined,
        defaultCategory,
        defaultOwnerId: assignTo === AUTO_ASSIGN ? null : assignTo,
        utmTags: utmTags.trim() || undefined,
        requireConsent,
      };
      if (isNew) {
        await websiteLeadSourceApi.createWebsiteLeadSource(payload);
        message.success("Website lead source created");
      } else {
        await websiteLeadSourceApi.updateWebsiteLeadSource(source.id, payload);
        message.success("Website lead source updated");
      }
      onSaved();
    } catch (err) {
      message.error(errorMessageFrom(err, "Failed to save this source"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      width={480}
      style={{ top: 24 }}
      styles={{ body: { maxHeight: "calc(100vh - 220px)", overflowY: "auto", paddingRight: 4 } }}
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
            <GlobalOutlined />
          </div>
          <Title level={5} style={{ margin: 0 }}>
            {isNew ? "Add website lead source" : `Edit ${source.name}`}
          </Title>
        </div>
      }
      footer={
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="primary" loading={saving} disabled={!canSave} onClick={handleSave}>
            {isNew ? "Create source" : "Save changes"}
          </Button>
        </div>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 8 }}>
        <div>
          <Text style={{ fontSize: 12.5, fontWeight: 500 }}>
            Source name <span style={{ color: appTokens.danger }}>*</span>
          </Text>
          <Input style={{ marginTop: 4 }} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. BlueStone — Instagram ad landing page" />
        </div>
        <div>
          <Text style={{ fontSize: 12.5, fontWeight: 500 }}>Website domain</Text>
          <Input
            style={{ marginTop: 4 }}
            value={allowedOrigin}
            onChange={(e) => setAllowedOrigin(e.target.value)}
            placeholder="https://theirwebsite.com"
          />
          <Text style={{ fontSize: 11, color: appTokens.textTertiary }}>Informational only - shown to their developer, not enforced as the security boundary</Text>
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
        <div>
          <Text style={{ fontSize: 12.5, fontWeight: 500 }}>UTM tags</Text>
          <Input style={{ marginTop: 4 }} value={utmTags} onChange={(e) => setUtmTags(e.target.value)} placeholder="website/instagram-ad/..." />
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <Text style={{ fontSize: 13, fontWeight: 500 }}>Require DPDP consent to submit</Text>
            <div>
              <Text style={{ fontSize: 11, color: appTokens.textTertiary }}>Blocks the submission unless their form sends consentGranted: true</Text>
            </div>
          </div>
          <Switch checked={requireConsent} onChange={setRequireConsent} />
        </div>
      </div>
    </Modal>
  );
}
