import { useNavigate } from "react-router-dom";
import { Avatar, Button, Empty, Space, Spin, Tag, Typography, message } from "antd";
import { ArrowRightOutlined } from "@ant-design/icons";
import { isAxiosError } from "axios";
import * as fofoOnboardingApi from "../../../api/fofo-onboarding-api";
import type { FofoHandoff } from "../../../types/fofo-onboarding";
import type { Lead } from "../../../types/lead";
import { useAuth } from "../../../context/AuthContext";
import { useHasPermission } from "../../../hooks/use-permission";
import { initials } from "../../../utils/lead-format";
import { appTokens } from "../../../utils/design-system";

const { Text, Title } = Typography;

const AVATAR_COLORS = ["#1677ff", "#722ed1", "#eb2f96", "#0ca30c", "#fa8c16", "#13c2c2", "#eda100", "#2f54eb"];
function avatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

const STEP_STATUS_COLORS: Record<string, string> = {
  pending: "orange",
  approved: "green",
  rejected: "red",
  not_applicable: "default",
};
const STEP_STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  not_applicable: "Not required",
};

interface ApprovalsTabProps {
  lead: Lead;
  canView: boolean;
  loading: boolean;
  handoff: FofoHandoff | null;
  onChanged: () => void;
}

// Real lead_approval_steps data - the same manager-hierarchy approval chain
// the standalone FOFO onboarding page uses, just presented as a compact
// read-only summary here. This is genuinely 1-3 steps (reporting manager,
// senior, regional head above a value threshold), not a fabricated 5-stage
// document/KYC gate system - showing more than that would misrepresent what
// the app actually enforces.
export function ApprovalsTab({ lead, canView, loading, handoff, onChanged }: ApprovalsTabProps) {
  const { user } = useAuth();
  const hasPermission = useHasPermission();
  const navigate = useNavigate();

  if (lead.category !== "FOFO") {
    return <Empty description="Approvals apply to FOFO franchise leads only" style={{ padding: 40 }} />;
  }
  if (!canView) {
    return <Empty description="You don't have permission to view this lead's approval chain" style={{ padding: 40 }} />;
  }
  if (loading || !handoff) {
    return (
      <div style={{ textAlign: "center", padding: 40 }}>
        <Spin />
      </div>
    );
  }

  const { approvalSteps } = handoff;

  const handleDecide = async (stepId: string, decision: "approved" | "rejected") => {
    try {
      await fofoOnboardingApi.decideStep(stepId, decision);
      message.success(decision === "approved" ? "Step approved" : "Step rejected");
      onChanged();
    } catch (err) {
      const description = isAxiosError<{ message?: string }>(err) && err.response?.data.message ? err.response.data.message : "Failed to decide step";
      message.error(description);
    }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
        <div>
          <Title level={5} style={{ margin: 0 }}>
            Approval chain
          </Title>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Reporting-hierarchy sign-off before this store can be pushed to onboarding
          </Text>
        </div>
        <Button size="small" icon={<ArrowRightOutlined />} iconPlacement="end" onClick={() => navigate(`/fofo-onboarding/${lead.id}`)}>
          Open full onboarding workflow
        </Button>
      </div>

      {approvalSteps.length === 0 ? (
        <Empty description="No one above this lead's owner in the reporting chain yet" style={{ padding: 24 }} />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {approvalSteps.map((step) => (
            <div
              key={step.id}
              style={{
                border: `1px solid ${appTokens.border}`,
                borderRadius: appTokens.radius,
                padding: 14,
                background: appTokens.surface,
                boxShadow: appTokens.shadowXs,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <Avatar size={28} style={{ backgroundColor: avatarColor(step.approverName ?? "?"), fontSize: 12 }}>
                    {step.approverName ? initials(step.approverName) : "?"}
                  </Avatar>
                  <div>
                    <Text strong style={{ fontSize: 13, display: "block" }}>
                      {step.approverName ?? "Unassigned"}
                    </Text>
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      {step.roleLabel}
                      {step.conditionNote ? ` · ${step.conditionNote}` : ""}
                    </Text>
                  </div>
                </div>
                <Tag color={STEP_STATUS_COLORS[step.status]} style={{ margin: 0 }}>
                  {STEP_STATUS_LABELS[step.status]}
                </Tag>
              </div>
              {step.isCurrentTurn && user?.id === step.approverUserId && hasPermission("fofo_onboarding.manage") && (
                <Space size={6} style={{ marginTop: 8, marginLeft: 36 }}>
                  <Button size="small" type="primary" onClick={() => handleDecide(step.id, "approved")}>
                    Approve
                  </Button>
                  <Button size="small" danger onClick={() => handleDecide(step.id, "rejected")}>
                    Reject
                  </Button>
                </Space>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
