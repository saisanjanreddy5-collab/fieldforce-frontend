import { PhoneOutlined, PushpinOutlined, ShopOutlined, TagsOutlined } from "@ant-design/icons";
import { OutlookLogo, TeamsLogo, WhatsAppLogo } from "../components/icons/BrandIcons";
import type { ActivityType } from "../types/activity";

export const TYPE_LABEL: Record<ActivityType, string> = {
  call: "Call",
  email: "Email",
  teams_meeting: "Meeting",
  site_visit: "Site visit",
  whatsapp: "WhatsApp",
  internal: "Internal",
  support_ticket: "Ticket",
};

export const TYPE_DOT_COLOR: Record<ActivityType, string> = {
  call: "#0ca30c",
  email: "#2a78d6",
  teams_meeting: "#4a3aa7",
  site_visit: "#eda100",
  whatsapp: "#1fa855",
  internal: "#6b7280",
  support_ticket: "#0f9aa8",
};

export const TYPE_ICON: Record<ActivityType, React.ReactNode> = {
  call: <PhoneOutlined style={{ color: TYPE_DOT_COLOR.call }} />,
  email: <OutlookLogo size={13} />,
  teams_meeting: <TeamsLogo size={13} />,
  site_visit: <ShopOutlined style={{ color: TYPE_DOT_COLOR.site_visit }} />,
  whatsapp: <WhatsAppLogo size={13} />,
  internal: <PushpinOutlined style={{ color: TYPE_DOT_COLOR.internal }} />,
  support_ticket: <TagsOutlined style={{ color: TYPE_DOT_COLOR.support_ticket }} />,
};

// Every type this app can ever produce - used for display/filtering in
// read-only views (e.g. the Logs tab) where a support_ticket-typed entry
// genuinely needs its own label/color, not to show as a blank one.
export const ALL_ACTIVITY_TYPES: ActivityType[] = ["email", "call", "teams_meeting", "site_visit", "whatsapp", "internal", "support_ticket"];

// Types a person can manually log via "+ Add action" - support_ticket is
// deliberately excluded here, since that type is only ever produced as a
// side effect of raising/updating/replying to a real ticket (see
// support-ticket-service.ts), never something to fabricate by hand.
export const CREATABLE_ACTIVITY_TYPES: ActivityType[] = ["email", "call", "teams_meeting", "site_visit", "whatsapp", "internal"];

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
