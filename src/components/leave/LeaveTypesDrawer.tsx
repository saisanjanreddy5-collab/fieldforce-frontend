import { Drawer, Typography } from "antd";
import type { LeaveBalance } from "../../types/leave";
import { appTokens } from "../../utils/design-system";

const { Text, Title } = Typography;

interface LeaveTypesDrawerProps {
  open: boolean;
  onClose: () => void;
  balances: LeaveBalance[];
}

export function LeaveTypesDrawer({ open, onClose, balances }: LeaveTypesDrawerProps) {
  return (
    <Drawer title="Leave types & policy" open={open} onClose={onClose} width={420}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {balances.map((b) => (
          <div
            key={b.key}
            style={{
              border: `1px solid ${appTokens.border}`,
              borderLeft: `4px solid ${b.color}`,
              borderRadius: appTokens.radiusSm,
              padding: "10px 14px",
              background: appTokens.surface,
            }}
          >
            <Title level={5} style={{ margin: 0, color: b.color }}>
              {b.label}
            </Title>
            <Text style={{ fontSize: 12.5, color: appTokens.textSecondary, display: "block", marginTop: 2 }}>
              {b.key === "comp_off" ? "As earned" : `${b.annualDays} days / year`}
              {b.accrualPerMonth !== null ? ` · accrues ${b.accrualPerMonth}/month` : ""}
              {b.carryForwardCap !== null ? ` · carry forward up to ${b.carryForwardCap}` : ""}
            </Text>
            <Text style={{ fontSize: 12, color: appTokens.textTertiary, display: "block", marginTop: 2 }}>{b.policyNote}</Text>
            <Text style={{ fontSize: 12, color: appTokens.textTertiary, display: "block" }}>{b.approverNote}</Text>
          </div>
        ))}
      </div>
    </Drawer>
  );
}
