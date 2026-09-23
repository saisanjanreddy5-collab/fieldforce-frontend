import { Avatar, Button, Progress, Tag, Tooltip, Typography } from "antd";
import {
  CloudUploadOutlined,
  EditOutlined,
  MailOutlined,
  PhoneOutlined,
  PlusOutlined,
  TeamOutlined,
  WhatsAppOutlined,
} from "@ant-design/icons";
import type { Lead } from "../../types/lead";
import { initials, scoreColor } from "../../utils/lead-format";
import { formatCompactCurrency } from "../../utils/lead-format";
import { getLeadPrimaryAction, PRIMARY_ACTION_LABEL, PRIMARY_ACTION_REASON, type LeadActionAvailability } from "../../utils/lead-primary-action";
import { avatarGradient, appTokens } from "../../utils/design-system";

const { Title, Text } = Typography;

const PRIMARY_ICON = {
  onboard: <CloudUploadOutlined />,
  addActivity: <PlusOutlined />,
  call: <PhoneOutlined />,
  editLead: <EditOutlined />,
};

interface LeadSnapshotProps {
  lead: Lead;
  showOwner: boolean;
  availability: LeadActionAvailability;
  calling: boolean;
  microsoftConnected: boolean;
  onCall: () => void;
  onEmail: () => void;
  onTeamsMeeting: () => void;
  onEdit: () => void;
  onOnboard: () => void;
  onAddActivity: () => void;
}

// The top-of-detail identity/value/status/owner strip, plus a *computed*
// primary action instead of a static row of equally-weighted buttons - see
// utils/lead-primary-action.ts for the (pure, testable, permission-free)
// priority logic. Everything here is presentational; all stateful behavior
// (modals, API calls) stays owned by LeadDetail and is wired in via props.
export function LeadSnapshot({
  lead,
  showOwner,
  availability,
  calling,
  microsoftConnected,
  onCall,
  onEmail,
  onTeamsMeeting,
  onEdit,
  onOnboard,
  onAddActivity,
}: LeadSnapshotProps) {
  const primaryAction = getLeadPrimaryAction(availability);
  const contactLine = [lead.contactName, lead.phone, lead.email].filter(Boolean).join(" · ");

  const primaryHandlers = { onboard: onOnboard, addActivity: onAddActivity, call: onCall, editLead: onEdit, none: () => undefined };
  const primaryLoading = primaryAction === "call" ? calling : false;

  const secondaryButtons: React.ReactNode[] = [];
  if (primaryAction !== "call") {
    secondaryButtons.push(
      <Tooltip key="call" title={!lead.phone ? "This lead has no phone number on file" : ""}>
        <Button icon={<PhoneOutlined />} disabled={!lead.phone} loading={calling} onClick={onCall}>
          Call
        </Button>
      </Tooltip>
    );
  }
  secondaryButtons.push(
    <Tooltip
      key="email"
      title={!microsoftConnected ? "Connect your Microsoft 365 account under Sales force management first" : !lead.email ? "This lead has no email address on file" : ""}
    >
      <Button icon={<MailOutlined />} disabled={!microsoftConnected || !lead.email} onClick={onEmail}>
        Email
      </Button>
    </Tooltip>
  );
  secondaryButtons.push(
    <Tooltip
      key="teams"
      title={!microsoftConnected ? "Connect your Microsoft 365 account under Sales force management first" : !lead.email ? "This lead has no email address on file" : ""}
    >
      <Button icon={<TeamOutlined />} disabled={!microsoftConnected || !lead.email} onClick={onTeamsMeeting}>
        Teams
      </Button>
    </Tooltip>
  );
  secondaryButtons.push(
    <Tooltip key="whatsapp" title="WhatsApp is not connected yet">
      <Button icon={<WhatsAppOutlined />} disabled>
        WhatsApp
      </Button>
    </Tooltip>
  );
  if (primaryAction !== "editLead" && availability.canEditLead) {
    secondaryButtons.push(
      <Button key="edit" icon={<EditOutlined />} onClick={onEdit}>
        Edit
      </Button>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
        <Avatar
          size={52}
          shape="square"
          style={{ background: avatarGradient(lead.fullName), flexShrink: 0, borderRadius: 12, fontSize: 18, fontWeight: 600, boxShadow: appTokens.shadowSm }}
        >
          {initials(lead.fullName)}
        </Avatar>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <Title level={4} style={{ margin: 0, letterSpacing: -0.2, color: appTokens.textPrimary }}>
              {lead.fullName}
            </Title>
            {lead.category && (
              <Tag
                style={{
                  margin: 0,
                  fontWeight: 600,
                  background: appTokens.primarySoft,
                  color: appTokens.primary,
                  border: `1px solid ${appTokens.primarySoftBorder}`,
                }}
              >
                {lead.category}
              </Tag>
            )}
            {lead.leadScore !== null && (
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Progress percent={lead.leadScore} size="small" showInfo={false} strokeColor={scoreColor(lead.leadScore)} style={{ width: 52 }} />
                <Text strong style={{ fontSize: 12, color: scoreColor(lead.leadScore) }}>
                  {lead.leadScore}%
                </Text>
              </div>
            )}
          </div>
          <Text style={{ color: appTokens.textSecondary, fontSize: 13.5 }}>{contactLine || "-"}</Text>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 12, flexWrap: "wrap" }}>
        <Tag
          style={{
            margin: 0,
            fontSize: 12.5,
            fontWeight: 600,
            padding: "4px 10px",
            background: appTokens.surfaceMuted,
            color: appTokens.textSecondary,
            border: `1px solid ${appTokens.borderLight}`,
          }}
        >
          {lead.status}
        </Tag>
        <Text strong style={{ fontSize: 16, color: appTokens.textPrimary }}>
          {formatCompactCurrency(lead.expectedValue)}
        </Text>
        {showOwner && (
          <Text style={{ fontSize: 13, color: appTokens.textTertiary }}>Owner: {lead.ownerName ?? "Unassigned"}</Text>
        )}
      </div>

      {primaryAction !== "none" && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            marginTop: 18,
            padding: "14px 18px",
            borderRadius: appTokens.radiusLg,
            background: `linear-gradient(135deg, ${appTokens.primary} 0%, #3f6fef 100%)`,
            boxShadow: "0 8px 20px rgba(19,84,224,0.22)",
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: "rgba(255,255,255,0.18)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                fontSize: 17,
                flexShrink: 0,
              }}
            >
              {PRIMARY_ICON[primaryAction]}
            </div>
            <div style={{ minWidth: 0 }}>
              <Text style={{ fontSize: 10.5, fontWeight: 700, display: "block", color: "rgba(255,255,255,0.75)", letterSpacing: 0.6 }}>
                RECOMMENDED NEXT STEP
              </Text>
              <Text strong style={{ fontSize: 14, color: "#fff", display: "block", lineHeight: 1.3 }}>
                {PRIMARY_ACTION_REASON[primaryAction]}
              </Text>
            </div>
          </div>
          <Button
            loading={primaryLoading}
            onClick={primaryHandlers[primaryAction]}
            style={{ background: "#fff", color: appTokens.primary, fontWeight: 700, border: "none", flexShrink: 0 }}
          >
            {PRIMARY_ACTION_LABEL[primaryAction]}
          </Button>
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginTop: 12, alignItems: "center", flexWrap: "wrap" }}>{secondaryButtons}</div>
    </div>
  );
}
