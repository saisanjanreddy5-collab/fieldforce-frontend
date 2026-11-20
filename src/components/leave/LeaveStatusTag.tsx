import { Tag } from "antd";
import type { LeaveRequestStatus } from "../../types/leave";
import { appTokens } from "../../utils/design-system";

const STATUS_COLOR: Record<LeaveRequestStatus, string> = {
  pending: appTokens.warning,
  approved: appTokens.success,
  rejected: appTokens.danger,
  cancelled: appTokens.textTertiary,
};

// The one status chip every leave-request table uses (My leave, Team
// requests, History).
export function LeaveStatusTag({ status }: { status: LeaveRequestStatus }) {
  return (
    <Tag style={{ color: STATUS_COLOR[status], background: `${STATUS_COLOR[status]}17`, border: "none", fontWeight: 600 }}>
      {status[0].toUpperCase() + status.slice(1)}
    </Tag>
  );
}
