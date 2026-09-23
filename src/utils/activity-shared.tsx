import { MailOutlined, PhoneOutlined, ShopOutlined, TeamOutlined } from "@ant-design/icons";
import type { ActivityType } from "../types/activity";

export const TYPE_LABEL: Record<ActivityType, string> = {
  call: "Call",
  email: "Email",
  teams_meeting: "Teams Meeting",
  site_visit: "Site Visit",
};

export const TYPE_DOT_COLOR: Record<ActivityType, string> = {
  call: "#0ca30c",
  email: "#2a78d6",
  teams_meeting: "#4a3aa7",
  site_visit: "#eda100",
};

export const TYPE_ICON: Record<ActivityType, React.ReactNode> = {
  call: <PhoneOutlined style={{ color: TYPE_DOT_COLOR.call }} />,
  email: <MailOutlined style={{ color: TYPE_DOT_COLOR.email }} />,
  teams_meeting: <TeamOutlined style={{ color: TYPE_DOT_COLOR.teams_meeting }} />,
  site_visit: <ShopOutlined style={{ color: TYPE_DOT_COLOR.site_visit }} />,
};

export const ALL_ACTIVITY_TYPES: ActivityType[] = ["email", "call", "teams_meeting", "site_visit"];

/** Small colored circle badge for an activity's type - shared between the
 * Activity (scheduled) and Logs (history) tabs so both use the same visual
 * language for "what kind of interaction is this." */
export function TypeBadge({ type }: { type: ActivityType }) {
  return (
    <div
      style={{
        width: 26,
        height: 26,
        borderRadius: "50%",
        background: `${TYPE_DOT_COLOR[type]}1a`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        fontSize: 13,
      }}
    >
      {TYPE_ICON[type]}
    </div>
  );
}
