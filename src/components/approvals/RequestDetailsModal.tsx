import { Descriptions, Modal, Tag, Timeline, Typography } from "antd";
import { CheckCircleFilled, ClockCircleOutlined, CloseCircleFilled } from "@ant-design/icons";
import { appTokens } from "../../utils/design-system";
import { formatDateTime } from "../../utils/lead-format";

const { Text } = Typography;

export interface ApprovalStep {
  label: string; // e.g. "Reporting manager"
  person: string | null;
  decision: "approved" | "rejected" | null;
  decidedAt: string | null;
}

// Read-only view of a leave request or expense claim - for Admins overseeing
// requests that someone else (the reporting manager) decides. Shows the
// request's details and where it is in its approval trail; no actions.
export function RequestDetailsModal({
  open,
  title,
  status,
  fields,
  steps,
  onClose,
}: {
  open: boolean;
  title: string;
  status: React.ReactNode;
  fields: { label: string; value: React.ReactNode }[];
  steps: ApprovalStep[];
  onClose: () => void;
}) {
  return (
    <Modal open={open} onCancel={onClose} footer={null} width={560} title={title} destroyOnHidden>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        {status}
        <Tag style={{ margin: 0 }}>View only</Tag>
      </div>
      <Descriptions size="small" column={1} bordered items={fields.map((f, i) => ({ key: i, label: f.label, children: f.value }))} />
      <Text strong style={{ display: "block", margin: "16px 0 10px" }}>
        Approval
      </Text>
      <Timeline
        items={steps.map((step) => ({
          color: step.decision === "approved" ? appTokens.success : step.decision === "rejected" ? appTokens.danger : appTokens.warning,
          dot:
            step.decision === "approved" ? (
              <CheckCircleFilled style={{ color: appTokens.success }} />
            ) : step.decision === "rejected" ? (
              <CloseCircleFilled style={{ color: appTokens.danger }} />
            ) : (
              <ClockCircleOutlined style={{ color: appTokens.warning }} />
            ),
          children: (
            <div>
              <Text strong>{step.label}</Text>
              <Text type="secondary"> · {step.person ?? "Not assigned"}</Text>
              <div>
                <Text style={{ fontSize: 12.5, color: appTokens.textSecondary }}>
                  {step.decision ? `${step.decision === "approved" ? "Approved" : "Rejected"}${step.decidedAt ? ` on ${formatDateTime(step.decidedAt)}` : ""}` : "Waiting for their decision"}
                </Text>
              </div>
            </div>
          ),
        }))}
      />
    </Modal>
  );
}
