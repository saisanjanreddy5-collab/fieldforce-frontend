import { PhoneOutlined, PushpinOutlined, ShopOutlined } from "@ant-design/icons";
import { OutlookLogo, TeamsLogo, WhatsAppLogo } from "../components/icons/BrandIcons";
import type { ActivityType } from "../types/activity";

export const TYPE_LABEL: Record<ActivityType, string> = {
  call: "Call",
  email: "Email",
  teams_meeting: "Meeting",
  site_visit: "Site visit",
  whatsapp: "WhatsApp",
  internal: "Internal",
};

export const TYPE_DOT_COLOR: Record<ActivityType, string> = {
  call: "#0ca30c",
  email: "#2a78d6",
  teams_meeting: "#4a3aa7",
  site_visit: "#eda100",
  whatsapp: "#1fa855",
  internal: "#6b7280",
};

export const TYPE_ICON: Record<ActivityType, React.ReactNode> = {
  call: <PhoneOutlined style={{ color: TYPE_DOT_COLOR.call }} />,
  email: <OutlookLogo size={13} />,
  teams_meeting: <TeamsLogo size={13} />,
  site_visit: <ShopOutlined style={{ color: TYPE_DOT_COLOR.site_visit }} />,
  whatsapp: <WhatsAppLogo size={13} />,
  internal: <PushpinOutlined style={{ color: TYPE_DOT_COLOR.internal }} />,
};

export const ALL_ACTIVITY_TYPES: ActivityType[] = ["email", "call", "teams_meeting", "site_visit", "whatsapp", "internal"];

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
