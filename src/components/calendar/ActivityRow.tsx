import { useState } from "react";
import { Button, Tag, Typography, message } from "antd";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import type { Activity } from "../../types/activity";
import { TYPE_DOT_COLOR, TYPE_ICON, TYPE_LABEL } from "../../utils/activity-shared";
import { appTokens } from "../../utils/design-system";
import { errorMessageFrom } from "../../utils/api-error";
import * as smartfloApi from "../../api/smartflo-api";
import * as activityApi from "../../api/activity-api";
import { EmailComposeDrawer } from "./EmailComposeDrawer";
import { SiteVisitModal } from "./SiteVisitModal";

const { Text } = Typography;

const DEFAULT_SUBLABEL: Record<Activity["type"], string> = {
  call: "Phone",
  email: "Outlook",
  teams_meeting: "Teams",
  site_visit: "Field",
  whatsapp: "WhatsApp",
  internal: "CRM",
};

const ACTION_LABEL: Record<Activity["type"], string | null> = {
  call: "Call",
  email: "Open mail",
  teams_meeting: "Join Teams",
  site_visit: "Directions",
  whatsapp: "WhatsApp",
  internal: null,
};

interface ActivityRowProps {
  activity: Activity;
  isLast?: boolean;
  onChanged?: () => void;
}

// Call, Open-mail, Directions, WhatsApp and Join-Teams are all wired to real
// endpoints/surfaces this codebase already has (Smartflo click-to-call, the
// real email-compose drawer, the real site-visit modal, the Leads page's
// own real WhatsApp tab, and the joinUrl a real Teams meeting was created
// with). WhatsApp deliberately reuses that existing tab (with its real send
// box and live-polled incoming messages) instead of building a second
// composer here - a duplicate one would drift from the real one over time.
export function ActivityRow({ activity, isLast, onChanged }: ActivityRowProps) {
  const navigate = useNavigate();
  const [emailDrawerOpen, setEmailDrawerOpen] = useState(false);
  const [siteVisitModalOpen, setSiteVisitModalOpen] = useState(false);
  const isCompleted = activity.status === "completed";
  const isOverdue = !isCompleted && activity.dueDate !== null && dayjs(activity.dueDate).isBefore(dayjs());
  const statusLabel = isCompleted ? "Done" : isOverdue ? "Overdue" : "Pending";
  const statusColor = isCompleted ? appTokens.success : isOverdue ? appTokens.danger : appTokens.textTertiary;

  const description = typeof activity.details.description === "string" ? activity.details.description : null;
  const durationMinutes = typeof activity.details.durationMinutes === "number" ? activity.details.durationMinutes : null;
  const location = typeof activity.details.location === "string" ? activity.details.location : null;
  const joinUrl = typeof activity.details.joinUrl === "string" ? activity.details.joinUrl : null;

  // Both Call and Send-email create their own fresh completed log activity
  // server-side (initiateCallForLead / sendMailForLead), separate from this
  // row's own scheduled activity - so this row's status is closed out
  // explicitly here too, otherwise a "Call" you just made would still sit
  // here as Overdue next to a brand-new "Done" log entry for the same call.
  const markThisDone = async () => {
    try {
      await activityApi.updateActivity(activity.id, { status: "completed" });
    } catch {
      // Best-effort - the underlying action already succeeded either way.
    }
    onChanged?.();
  };

  const handleAction = async () => {
    if (activity.type === "call") {
      if (!activity.leadId) {
        message.error("This activity isn't linked to a lead");
        return;
      }
      try {
        await smartfloApi.callLead(activity.leadId);
        message.success("Calling now");
        await markThisDone();
      } catch (err) {
        message.error(errorMessageFrom(err, "Failed to place the call"));
      }
      return;
    }
    if (activity.type === "email") {
      if (!activity.leadId) {
        message.error("This activity isn't linked to a lead");
        return;
      }
      setEmailDrawerOpen(true);
      return;
    }
    if (activity.type === "teams_meeting") {
      if (joinUrl) {
        window.open(joinUrl, "_blank", "noopener,noreferrer");
      } else {
        message.info("No Teams link on this meeting yet");
      }
      return;
    }
    if (activity.type === "site_visit") {
      if (!activity.leadId) {
        message.error("This activity isn't linked to a lead");
        return;
      }
      setSiteVisitModalOpen(true);
      return;
    }
    if (activity.type === "whatsapp") {
      if (!activity.leadId) {
        message.error("This activity isn't linked to a lead");
        return;
      }
      navigate(`/leads?leadId=${activity.leadId}&tab=whatsapp`);
      return;
    }
    message.info(`${ACTION_LABEL[activity.type]} opens in the next phase of the Activity calendar`);
  };

  const actionLabel = ACTION_LABEL[activity.type];

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 4px",
        borderBottom: isLast ? "none" : `1px solid ${appTokens.borderLight}`,
        borderLeft: `3px solid ${TYPE_DOT_COLOR[activity.type]}`,
        paddingLeft: 10,
      }}
    >
      <div style={{ width: 44, flexShrink: 0 }}>
        <Text strong style={{ fontSize: 12.5 }}>
          {activity.dueDate ? dayjs(activity.dueDate).format("HH:mm") : "--:--"}
        </Text>
        {durationMinutes !== null && (
          <Text style={{ fontSize: 10.5, color: appTokens.textTertiary, display: "block", lineHeight: 1.2 }}>
            {durationMinutes >= 60 ? `${Math.round(durationMinutes / 60)}h` : `${durationMinutes}m`}
          </Text>
        )}
      </div>

      <div style={{ width: 16, flexShrink: 0, textAlign: "center", fontSize: 13, lineHeight: 1 }}>{TYPE_ICON[activity.type]}</div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", lineHeight: 1.3 }}>
          <Text strong style={{ fontSize: 13 }}>
            {activity.subject ?? TYPE_LABEL[activity.type]}
          </Text>
          <Tag
            style={{
              margin: 0,
              fontSize: 10.5,
              lineHeight: "14px",
              padding: "0 5px",
              color: TYPE_DOT_COLOR[activity.type],
              background: `${TYPE_DOT_COLOR[activity.type]}17`,
              border: "none",
              fontWeight: 600,
            }}
          >
            {TYPE_LABEL[activity.type]}
          </Tag>
        </div>
        {description && (
          <Text style={{ fontSize: 11.5, color: appTokens.textTertiary, display: "block", lineHeight: 1.3 }}>{description}</Text>
        )}
      </div>

      <div style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ width: 104, flexShrink: 0 }}>
          {actionLabel && (
            <Button
              size="small"
              icon={TYPE_ICON[activity.type]}
              style={{
                width: "100%",
                height: 26,
                fontSize: 12,
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: TYPE_DOT_COLOR[activity.type],
                background: `${TYPE_DOT_COLOR[activity.type]}17`,
                border: "none",
                boxShadow: "none",
              }}
              onClick={handleAction}
            >
              {actionLabel}
            </Button>
          )}
        </div>
        <div style={{ width: 58, flexShrink: 0, textAlign: "right", lineHeight: 1.25 }}>
          <Text strong style={{ fontSize: 11, color: statusColor, display: "block" }}>
            {statusLabel}
          </Text>
          <Text style={{ fontSize: 10.5, color: appTokens.textTertiary }}>{location ?? DEFAULT_SUBLABEL[activity.type]}</Text>
        </div>
      </div>

      {activity.leadId && (
        <EmailComposeDrawer
          open={emailDrawerOpen}
          onClose={() => setEmailDrawerOpen(false)}
          leadId={activity.leadId}
          activityDueDate={activity.dueDate}
          onSent={async () => {
            setEmailDrawerOpen(false);
            await markThisDone();
          }}
        />
      )}

      {activity.leadId && (
        <SiteVisitModal
          open={siteVisitModalOpen}
          onClose={() => setSiteVisitModalOpen(false)}
          leadId={activity.leadId}
          dueDate={activity.dueDate}
          purpose={description}
        />
      )}
    </div>
  );
}
