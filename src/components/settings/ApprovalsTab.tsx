import { useEffect, useState } from "react";
import { Button, InputNumber, Modal, Tag, Typography, message } from "antd";
import { useNavigate } from "react-router-dom";
import * as appSettingsApi from "../../api/app-settings-api";
import * as approvalBandApi from "../../api/approval-band-api";
import * as levelApi from "../../api/level-api";
import type { ApprovalBand, ApprovalRequestType } from "../../types/approval-band";
import type { Level } from "../../types/level";
import { errorMessageFrom } from "../../utils/api-error";
import { appTokens } from "../../utils/design-system";
import { ApprovalBandDrawer } from "../ApprovalBandDrawer";

const { Text, Title } = Typography;

const THRESHOLD_KEY = "high_value_deal_threshold";

interface Row {
  key: string;
  name: string;
  description: string;
  status: "enforced" | "configured_only" | "not_built";
  action: "edit_threshold" | "edit_bands" | null;
  bandType?: ApprovalRequestType;
}

// One flat list, same visual language as every other Settings tab (Stages,
// Categories, Assignment rules) - a grid of separately-styled cards here
// was the actual complaint, not the underlying honesty about what's real.
export function ApprovalsTab() {
  const navigate = useNavigate();
  const [threshold, setThreshold] = useState<number | null>(null);
  const [bands, setBands] = useState<ApprovalBand[]>([]);
  const [levels, setLevels] = useState<Level[]>([]);
  const [loading, setLoading] = useState(true);
  const [thresholdModalOpen, setThresholdModalOpen] = useState(false);
  const [addBandOpen, setAddBandOpen] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([appSettingsApi.getSetting(THRESHOLD_KEY), approvalBandApi.listApprovalBands(), levelApi.listLevels()])
      .then(([setting, bandsResult, levelsResult]) => {
        setThreshold(Number(setting.value));
        setBands(bandsResult);
        setLevels(levelsResult);
      })
      .catch(() => message.error("Failed to load approval settings"))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const bandsOfType = (type: ApprovalRequestType) => bands.filter((b) => b.requestType === type);
  const bandDescription = (type: ApprovalRequestType) => {
    const count = bandsOfType(type).length;
    return count > 0 ? `${count} band${count === 1 ? "" : "s"} configured` : "No bands configured";
  };
  const nextSortOrder = bands.length > 0 ? Math.max(...bands.map((b) => b.sortOrder)) + 1 : 0;

  const rows: Row[] = [
    {
      key: "deal_value",
      name: "Deal value approval",
      description: `Real and enforced - regional head sign-off required above ₹${threshold !== null ? (threshold / 100000).toFixed(0) : "…"}L, before a lead can be pushed to FOFO onboarding.`,
      status: "enforced",
      action: "edit_threshold",
    },
    {
      key: "customer_creation",
      name: "Customer creation",
      description: bandDescription("customer_creation"),
      status: "configured_only",
      action: "edit_bands",
      bandType: "customer_creation",
    },
    {
      key: "credit_limit",
      name: "Credit limit change",
      description: bandDescription("credit_limit"),
      status: "configured_only",
      action: "edit_bands",
      bandType: "credit_limit",
    },
    {
      key: "discount",
      name: "Discount above slab",
      description: bandDescription("discount"),
      status: "configured_only",
      action: "edit_bands",
      bandType: "discount",
    },
    {
      key: "category_change",
      name: "Category change",
      description: "Doesn't exist yet - changing a lead's category has no approval gate today.",
      status: "not_built",
      action: null,
    },
  ];

  const STATUS_LABEL: Record<Row["status"], string> = {
    enforced: "Enforced",
    configured_only: "Not enforced",
    not_built: "Not built",
  };
  const STATUS_COLOR: Record<Row["status"], string> = {
    enforced: appTokens.success,
    configured_only: appTokens.warning,
    not_built: appTokens.textTertiary,
  };

  return (
    <div
      style={{
        border: `1px solid ${appTokens.border}`,
        borderRadius: appTokens.radius,
        background: appTokens.surface,
        boxShadow: appTokens.shadowSm,
      }}
    >
      <div style={{ padding: "14px 18px", borderBottom: `1px solid ${appTokens.borderLight}` }}>
        <Text strong style={{ fontSize: 14 }}>
          Approval matrix
        </Text>
        <div>
          <Text style={{ fontSize: 12.5, color: appTokens.textTertiary }}>
            Who signs off on what. "Enforced" actually blocks something today; "Not enforced" is configured but nothing
            checks it yet.
          </Text>
        </div>
      </div>

      {!loading &&
        rows.map((row, idx) => (
          <div
            key={row.key}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 18,
              padding: "14px 28px 14px 18px",
              borderBottom: idx === rows.length - 1 ? "none" : `1px solid ${appTokens.borderLight}`,
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <Text strong style={{ fontSize: 13.5 }}>
                {row.name}
              </Text>
              <div>
                <Text style={{ fontSize: 12, color: appTokens.textTertiary }}>{row.description}</Text>
              </div>
            </div>
            <Tag
              style={{
                margin: 0,
                width: 96,
                textAlign: "center",
                fontWeight: 600,
                border: "none",
                color: STATUS_COLOR[row.status],
                background: `${STATUS_COLOR[row.status]}17`,
                flexShrink: 0,
              }}
            >
              {STATUS_LABEL[row.status]}
            </Tag>
            {row.action === "edit_threshold" && (
              <Button size="small" type="link" onClick={() => setThresholdModalOpen(true)}>
                Edit
              </Button>
            )}
            {row.action === "edit_bands" && (
              <Button size="small" type="link" onClick={() => navigate("/sales-force-management")}>
                Edit
              </Button>
            )}
            {row.action === null && (
              <Text style={{ fontSize: 12, color: appTokens.textTertiary, width: 32, textAlign: "right" }}>—</Text>
            )}
          </div>
        ))}

      <div style={{ padding: "14px 18px" }}>
        <Button onClick={() => setAddBandOpen(true)}>+ Add approval band</Button>
      </div>

      <ThresholdModal
        open={thresholdModalOpen}
        onClose={() => setThresholdModalOpen(false)}
        currentValue={threshold}
        onSaved={(value) => {
          setThreshold(value);
          setThresholdModalOpen(false);
        }}
      />

      <ApprovalBandDrawer
        open={addBandOpen}
        band={null}
        defaultRequestType="discount"
        nextSortOrder={nextSortOrder}
        levels={levels}
        onClose={() => setAddBandOpen(false)}
        onSaved={() => {
          setAddBandOpen(false);
          load();
        }}
      />
    </div>
  );
}

interface ThresholdModalProps {
  open: boolean;
  onClose: () => void;
  currentValue: number | null;
  onSaved: (value: number) => void;
}

function ThresholdModal({ open, onClose, currentValue, onSaved }: ThresholdModalProps) {
  const [value, setValue] = useState<number | null>(currentValue);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setValue(currentValue);
  }, [open, currentValue]);

  const handleSave = async () => {
    if (value === null) return;
    setSaving(true);
    try {
      await appSettingsApi.setSetting(THRESHOLD_KEY, value);
      message.success("Threshold updated");
      onSaved(value);
    } catch (err) {
      message.error(errorMessageFrom(err, "Failed to update threshold"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      width={400}
      footer={null}
      title={
        <Title level={5} style={{ margin: 0 }}>
          Regional head approval threshold
        </Title>
      }
    >
      <Text style={{ fontSize: 12.5, color: appTokens.textTertiary, display: "block", marginBottom: 12 }}>
        Deals above this value require the third (regional head) approval step; below it, that step is automatically
        marked not applicable.
      </Text>
      <InputNumber
        style={{ width: "100%" }}
        min={0}
        step={100000}
        value={value}
        onChange={setValue}
        formatter={(v) => (v ? `₹ ${Number(v).toLocaleString("en-IN")}` : "")}
      />
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 20 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button type="primary" loading={saving} onClick={handleSave}>
          Save
        </Button>
      </div>
    </Modal>
  );
}
