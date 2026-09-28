import { Button, Tag, Typography, message } from "antd";
import dayjs from "dayjs";
import type { Activity } from "../../types/activity";
import { TYPE_DOT_COLOR, TYPE_ICON, TYPE_LABEL } from "../../utils/activity-shared";
import { appTokens } from "../../utils/design-system";
import { errorMessageFrom } from "../../utils/api-error";
import * as smartfloApi from "../../api/smartflo-api";

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
}

// Call and Join-Teams are wired to the real endpoints this codebase already
// has (Smartflo click-to-call, and the joinUrl a real Teams meeting was
// created with). Open mail / Directions / WhatsApp render the same as the
// reference but are honest about not opening their real surface yet - that
// lands with the compose drawer / site-visit modal in the next phase,
// instead of faking a working button today.
export function ActivityRow({ activity, isLast }: ActivityRowProps) {
  const isCompleted = activity.status === "completed";
  const isOverdue = !isCompleted && activity.dueDate !== null && dayjs(activity.dueDate).isBefore(dayjs());
  const statusLabel = isCompleted ? "Done" : isOverdue ? "Overdue" : "Pending";
  const statusColor = isCompleted ? appTokens.success : isOverdue ? appTokens.danger : appTokens.textTertiary;

  const description = typeof activity.details.description === "string" ? activity.details.description : null;
  const durationMinutes = typeof activity.details.durationMinutes === "number" ? activity.details.durationMinutes : null;
  const location = typeof activity.details.location === "string" ? activity.details.location : null;
  const joinUrl = typeof activity.details.joinUrl === "string" ? activity.details.joinUrl : null;

  const handleAction = async () => {
    if (activity.type === "call") {
      if (!activity.leadId) {
        message.error("This activity isn't linked to a lead");
        return;
      }
      try {
        await smartfloApi.callLead(activity.leadId);
        message.success("Calling now");
      } catch (err) {
        message.error(errorMessageFrom(err, "Failed to place the call"));
      }
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
        <div style={{ textAlign: "right", lineHeight: 1.25 }}>
          <Text strong style={{ fontSize: 11, color: statusColor, display: "block" }}>
            {statusLabel}
          </Text>
          <Text style={{ fontSize: 10.5, color: appTokens.textTertiary }}>{location ?? DEFAULT_SUBLABEL[activity.type]}</Text>
        </div>
        {actionLabel && (
          <Button size="small" style={{ height: 24, fontSize: 12, paddingInline: 8 }} onClick={handleAction}>
            {actionLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
