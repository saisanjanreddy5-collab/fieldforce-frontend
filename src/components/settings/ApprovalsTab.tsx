import { useEffect, useState } from "react";
import { Button, Tag, Typography, message } from "antd";
import { useNavigate } from "react-router-dom";
import * as approvalBandApi from "../../api/approval-band-api";
import * as levelApi from "../../api/level-api";
import type { ApprovalBand, ApprovalRequestType } from "../../types/approval-band";
import type { Level } from "../../types/level";
import { appTokens } from "../../utils/design-system";
import { useHasPermission } from "../../hooks/use-permission";
import { ApprovalBandDrawer } from "../ApprovalBandDrawer";

const { Text } = Typography;

interface Row {
  key: string;
  name: string;
  description: string;
  status: "configured_only" | "not_built";
  action: "edit_bands" | null;
  bandType?: ApprovalRequestType;
}

// One flat list, same visual language as every other Settings tab (Stages,
// Categories, Assignment rules) - a grid of separately-styled cards here
// was the actual complaint, not the underlying honesty about what's real.
export function ApprovalsTab() {
  const navigate = useNavigate();
  const hasPermission = useHasPermission();
  // Same permission the backend checks: POST /approval-bands.
  const canAddBand = hasPermission("approval_bands.create");
  const [bands, setBands] = useState<ApprovalBand[]>([]);
  const [levels, setLevels] = useState<Level[]>([]);
  const [loading, setLoading] = useState(true);
  const [addBandOpen, setAddBandOpen] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([approvalBandApi.listApprovalBands(), levelApi.listLevels()])
      .then(([bandsResult, levelsResult]) => {
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
      description: "Changing a lead's category doesn't require approval.",
      status: "not_built",
      action: null,
    },
  ];

  const STATUS_LABEL: Record<Row["status"], string> = {
    configured_only: "Not enforced",
    not_built: "Not available",
  };
  const STATUS_COLOR: Record<Row["status"], string> = {
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
            Who signs off on what. "Not enforced" rules are configured but not applied yet.
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

      {canAddBand && (
        <div style={{ padding: "14px 18px" }}>
          <Button onClick={() => setAddBandOpen(true)}>+ Add approval band</Button>
        </div>
      )}

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
