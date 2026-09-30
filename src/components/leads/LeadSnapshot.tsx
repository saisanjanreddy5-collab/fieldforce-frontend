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
import { LEAD_STATUS_COLORS } from "../../utils/lead-constants";

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
  onWhatsApp: () => void;
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
  onWhatsApp,
}: LeadSnapshotProps) {
  const primaryAction = getLeadPrimaryAction(availability);
  const contactLine = [lead.contactName, lead.phone, lead.email].filter(Boolean).join(" · ");

  const primaryHandlers = { onboard: onOnboard, addActivity: onAddActivity, call: onCall, editLead: onEdit, none: () => undefined };
  const primaryLoading = primaryAction === "call" ? calling : false;

  // The computed primary action gets its own row, above the secondary
  // utility actions - a normal solid-primary button, not a promotional
  // banner, but still visually distinct from "one of six equal buttons" so
  // it doesn't randomly wrap into a 4+2 split depending on panel width. The
  // "why" (e.g. "This FOFO lead is ready to start onboarding") is a tooltip
  // instead of a permanent block of screen space.
  const primaryButton =
    primaryAction !== "none" ? (
      <Tooltip title={PRIMARY_ACTION_REASON[primaryAction]}>
        <Button type="primary" icon={PRIMARY_ICON[primaryAction]} loading={primaryLoading} onClick={primaryHandlers[primaryAction]}>
          {PRIMARY_ACTION_LABEL[primaryAction]}
        </Button>
      </Tooltip>
    ) : null;

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
      title={!microsoftConnected ? "Connect your Microsoft 365 account from your profile (top right) first" : !lead.email ? "This lead has no email address on file" : ""}
    >
      <Button icon={<MailOutlined />} disabled={!microsoftConnected || !lead.email} onClick={onEmail}>
        Email
      </Button>
    </Tooltip>
  );
  secondaryButtons.push(
    <Tooltip
      key="teams"
      title={!microsoftConnected ? "Connect your Microsoft 365 account from your profile (top right) first" : !lead.email ? "This lead has no email address on file" : ""}
    >
      <Button icon={<TeamOutlined />} disabled={!microsoftConnected || !lead.email} onClick={onTeamsMeeting}>
        Teams
      </Button>
    </Tooltip>
  );
  secondaryButtons.push(
    <Tooltip key="whatsapp" title={!lead.phone ? "This lead has no phone number on file" : ""}>
      <Button icon={<WhatsAppOutlined />} disabled={!lead.phone} onClick={onWhatsApp}>
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
            background: `${LEAD_STATUS_COLORS[lead.status] ?? appTokens.textSecondary}17`,
            color: LEAD_STATUS_COLORS[lead.status] ?? appTokens.textSecondary,
            border: "none",
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

      {primaryButton && <div style={{ marginTop: 16 }}>{primaryButton}</div>}
      <div style={{ display: "flex", gap: 8, marginTop: primaryButton ? 8 : 16, alignItems: "center", flexWrap: "wrap" }}>{secondaryButtons}</div>
    </div>
  );
}
