import type { ReactNode } from "react";
import { Avatar, Button, Progress, Tag, Tooltip, Typography } from "antd";
import { CloudUploadOutlined, EditOutlined, PhoneOutlined, PlusOutlined } from "@ant-design/icons";
import { OutlookLogo, TeamsLogo, WhatsAppLogo } from "../icons/BrandIcons";
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
  // Send to Field Sales / Reassign / History - rendered by LeadAssignmentPanel,
  // which owns all of that logic/state. Taken as a slot here (not imported
  // directly) so this component stays purely presentational, per its own
  // contract - it just places the result next to the owner's name instead of
  // giving it a separate full-width row, which used to duplicate "Owner: X"
  // a second time for no new information.
  assignmentActions?: ReactNode;
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
  assignmentActions,
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

  // One compact row of icon-only buttons, beside the lead's name, instead
  // of two stacked full-width rows (a computed "primary" row above a
  // separate secondary row) - that cost two whole rows of vertical space
  // just to keep one button visually distinct. Solid color (type="primary")
  // still marks the computed recommended action; it just doesn't need its
  // own row to do it. Tooltip carries the label and the "why" since there's
  // no room for text here.
  const actionButtons: React.ReactNode[] = [];
  if (primaryAction !== "none") {
    actionButtons.push(
      <Tooltip key="primary" title={`${PRIMARY_ACTION_LABEL[primaryAction]} - ${PRIMARY_ACTION_REASON[primaryAction]}`}>
        <Button
          type="primary"
          shape="circle"
          size="large"
          icon={PRIMARY_ICON[primaryAction]}
          loading={primaryLoading}
          onClick={primaryHandlers[primaryAction]}
        />
      </Tooltip>
    );
  }
  // Every reason below this one is about whether contact info exists at
  // all - this one's about whether this person is even allowed to use it.
  // Checked first and worded differently on purpose: a lead handed off to
  // someone else isn't "missing a phone number," it's just not this
  // person's to contact anymore (read-only via lead_shares - see
  // shareLeadBackToSender in lead-call-center-service.ts).
  const notOwnedTitle = "This lead has been handed off to someone else - you can view it, but not contact it from here";
  if (primaryAction !== "call") {
    actionButtons.push(
      <Tooltip key="call" title={!lead.inOwnerScope ? notOwnedTitle : !lead.phone ? "This lead has no phone number on file" : "Call"}>
        <Button
          shape="circle"
          size="large"
          icon={<PhoneOutlined />}
          disabled={!lead.phone || !lead.inOwnerScope}
          loading={calling}
          onClick={onCall}
        />
      </Tooltip>
    );
  }
  actionButtons.push(
    <Tooltip
      key="email"
      title={
        !lead.inOwnerScope
          ? notOwnedTitle
          : !microsoftConnected
            ? "Connect your Microsoft 365 account from your profile (top right) first"
            : !lead.email
              ? "This lead has no email address on file"
              : "Email"
      }
    >
      <Button
        shape="circle"
        size="large"
        icon={<OutlookLogo size={20} />}
        disabled={!microsoftConnected || !lead.email || !lead.inOwnerScope}
        onClick={onEmail}
      />
    </Tooltip>
  );
  actionButtons.push(
    <Tooltip
      key="teams"
      title={
        !lead.inOwnerScope
          ? notOwnedTitle
          : !microsoftConnected
            ? "Connect your Microsoft 365 account from your profile (top right) first"
            : !lead.email
              ? "This lead has no email address on file"
              : "Teams meeting"
      }
    >
      <Button
        shape="circle"
        size="large"
        icon={<TeamsLogo size={20} />}
        disabled={!microsoftConnected || !lead.email || !lead.inOwnerScope}
        onClick={onTeamsMeeting}
      />
    </Tooltip>
  );
  actionButtons.push(
    <Tooltip key="whatsapp" title={!lead.inOwnerScope ? notOwnedTitle : !lead.phone ? "This lead has no phone number on file" : "WhatsApp"}>
      <Button shape="circle" size="large" icon={<WhatsAppLogo size={20} />} disabled={!lead.phone || !lead.inOwnerScope} onClick={onWhatsApp} />
    </Tooltip>
  );
  if (primaryAction !== "editLead" && availability.canEditLead) {
    actionButtons.push(
      <Tooltip key="edit" title="Edit lead">
        <Button shape="circle" size="large" icon={<EditOutlined />} onClick={onEdit} />
      </Tooltip>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start", minWidth: 0 }}>
          <Avatar
            size={52}
            shape="square"
            style={{ background: avatarGradient(lead.fullName), flexShrink: 0, borderRadius: 12, fontSize: 18, fontWeight: 600, boxShadow: appTokens.shadowSm }}
          >
            {initials(lead.fullName)}
          </Avatar>
          <div style={{ minWidth: 0 }}>
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

        {/* Status/value/owner - shares this row with the name block and the
            action buttons instead of sitting on its own line below, which
            used to leave a large blank gap here once the page had enough
            width (list rail collapsed). Measured against real leads first:
            comfortably fits alongside the icons at that width (~1000px of
            ~1076px available); at the narrower default width the name block
            and icons already wrap onto separate lines regardless, same as
            before this change. */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", minWidth: 0 }}>
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
          {assignmentActions}
        </div>

        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>{actionButtons}</div>
      </div>
    </div>
  );
}
