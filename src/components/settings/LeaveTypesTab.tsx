import { useEffect, useState } from "react";
import { Button, Typography, message } from "antd";
import {
  ClockCircleOutlined,
  HomeOutlined,
  MedicineBoxOutlined,
  MoonOutlined,
  PlusCircleOutlined,
  SwapOutlined,
} from "@ant-design/icons";
import * as leaveApi from "../../api/leave-api";
import type { LeaveType, LeaveTypeKey } from "../../types/leave";
import { appTokens } from "../../utils/design-system";
import { EditLeaveTypeModal } from "./EditLeaveTypeModal";

const { Text } = Typography;

const TYPE_ICON: Record<LeaveTypeKey, React.ReactNode> = {
  casual: <ClockCircleOutlined />,
  sick: <MedicineBoxOutlined />,
  earned: <PlusCircleOutlined />,
  comp_off: <SwapOutlined />,
};

function entitlementLabel(type: LeaveType): string {
  if (type.key === "comp_off") return "As earned";
  if (type.annualDays !== null) return `${type.annualDays} / year`;
  return "—";
}

export function LeaveTypesTab() {
  const [types, setTypes] = useState<LeaveType[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<LeaveType | null>(null);

  const load = () => {
    setLoading(true);
    leaveApi
      .listLeaveTypes()
      .then(setTypes)
      .catch(() => message.error("Failed to load leave types"))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  return (
    <div
      style={{
        border: `1px solid ${appTokens.border}`,
        borderRadius: appTokens.radius,
        background: appTokens.surface,
        boxShadow: appTokens.shadowSm,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", borderBottom: `1px solid ${appTokens.borderLight}` }}>
        <div>
          <Text strong style={{ fontSize: 14 }}>
            Leave types &amp; policy
          </Text>
          <div>
            <Text style={{ fontSize: 12.5, color: appTokens.textTertiary }}>Entitlement per year and the approval each type needs</Text>
          </div>
        </div>
      </div>

      {!loading &&
        types.map((type) => (
          <div
            key={type.key}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 18,
              padding: "14px 28px 14px 18px",
              borderBottom: `1px solid ${appTokens.borderLight}`,
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: `${type.color}17`,
                color: type.color,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              {TYPE_ICON[type.key]}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <Text strong style={{ fontSize: 13.5 }}>
                {type.label}
              </Text>
              <div>
                <Text style={{ fontSize: 12, color: appTokens.textTertiary }}>{type.policyNote}</Text>
              </div>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0, minWidth: 90 }}>
              <Text strong style={{ fontSize: 13, display: "block" }}>
                {entitlementLabel(type)}
              </Text>
              <Text style={{ fontSize: 11.5, color: appTokens.textTertiary }}>{type.approverNote}</Text>
            </div>
            <Button size="small" type="link" onClick={() => setEditing(type)}>
              Edit
            </Button>
          </div>
        ))}

      {/* Half day and WFH have no leave_types row of their own - they're
          submitted/approved the same way, but there's no annual entitlement
          or accrual to configure for them, so shown read-only with what
          actually governs them today instead of an invented number. */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", borderBottom: `1px solid ${appTokens.borderLight}` }}>
        <div style={{ width: 32, height: 32, borderRadius: "50%", background: appTokens.surfaceMuted, color: appTokens.textSecondary, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <MoonOutlined />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Text strong style={{ fontSize: 13.5 }}>
            Half day
          </Text>
          <div>
            <Text style={{ fontSize: 12, color: appTokens.textTertiary }}>Always counts as 0.5 days, single day only</Text>
          </div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0, minWidth: 90 }}>
          <Text strong style={{ fontSize: 13, display: "block" }}>
            Counts 0.5
          </Text>
          <Text style={{ fontSize: 11.5, color: appTokens.textTertiary }}>Reporting manager</Text>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 18px" }}>
        <div style={{ width: 32, height: 32, borderRadius: "50%", background: appTokens.surfaceMuted, color: appTokens.textSecondary, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <HomeOutlined />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Text strong style={{ fontSize: 13.5 }}>
            Work from home
          </Text>
          <div>
            <Text style={{ fontSize: 12, color: appTokens.textTertiary }}>Tracked for visibility - no monthly cap enforced yet</Text>
          </div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0, minWidth: 90 }}>
          <Text strong style={{ fontSize: 13, display: "block" }}>
            No limit
          </Text>
          <Text style={{ fontSize: 11.5, color: appTokens.textTertiary }}>Reporting manager</Text>
        </div>
      </div>

      <EditLeaveTypeModal
        open={editing !== null}
        onClose={() => setEditing(null)}
        leaveType={editing}
        onSaved={() => {
          setEditing(null);
          load();
        }}
      />
    </div>
  );
}
