import {
  AimOutlined,
  AppstoreOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ClusterOutlined,
  DashboardOutlined,
  ExportOutlined,
  FileDoneOutlined,
  FileTextOutlined,
  GlobalOutlined,
  PhoneOutlined,
  SafetyCertificateOutlined,
  SettingOutlined,
  TableOutlined,
  TagsOutlined,
  WalletOutlined,
} from "@ant-design/icons";
import type { ReactNode } from "react";

export interface NavLeaf {
  path: string;
  label: string;
  icon: ReactNode;
  /**
   * Which real permissions make this item visible - OR semantics: holding
   * any one of them is enough (a multi-tab page like Sales force management
   * lists every one of its own tabs' view permissions, so the nav item stays
   * visible as long as at least one tab would render something).
   */
  permissions?: string[];
  /**
   * When set, clicking this item opens this URL in a new tab instead of
   * navigating to `path` inside the app. Used for Support tickets, which
   * now hands off to Frappe Helpdesk's own real agent UI via SSO rather
   * than rendering the old custom-built page in this app.
   */
  externalUrl?: string;
}

export interface NavGroup {
  groupLabel: string;
  items: NavLeaf[];
}

// Who may open Settings at all - shared by the nav item below and
// SettingsPage itself, so typing /settings directly can never reach a page
// the menu deliberately hides (see the comment on the Settings entry).
export const SETTINGS_PERMISSIONS = [
  "assignment_rules.view", "approval_bands.view",
  "app_settings.view", "qr_campaigns.view",
  "users.view",
];

export const NAV_GROUPS: NavGroup[] = [
  {
    groupLabel: "Sell",
    items: [
      { path: "/", label: "Dashboard", icon: <DashboardOutlined />, permissions: ["dashboard.view"] },
      { path: "/leads", label: "Leads", icon: <AimOutlined />, permissions: ["leads.view"] },
      { path: "/opportunities", label: "Opportunities", icon: <TableOutlined />, permissions: ["opportunities.view"] },
      { path: "/quotes", label: "Quotes", icon: <FileDoneOutlined />, permissions: ["quotes.view"] },
      { path: "/fofo-onboarding", label: "FOFO onboarding", icon: <ExportOutlined />, permissions: ["fofo_onboarding.view"] },
    ],
  },
  {
    groupLabel: "Relate",
    items: [
      { path: "/customers", label: "Customers", icon: <GlobalOutlined />, permissions: ["customers.view"] },
      { path: "/call-center", label: "Call center", icon: <PhoneOutlined />, permissions: ["call_center.view"] },
      {
        path: "/support-tickets",
        label: "Support tickets",
        icon: <TagsOutlined />,
        permissions: ["support_tickets.view"],
        // One click into Frappe Helpdesk, already logged in - the backend
        // checks access, gets a fresh login link from Frappe and sends the
        // browser straight through (see sso-controller.ts launch()).
        externalUrl: `${import.meta.env.VITE_API_BASE_URL}/sso/launch`,
      },
    ],
  },
  {
    groupLabel: "Team",
    items: [
      { path: "/team/dashboard", label: "Team", icon: <AppstoreOutlined />, permissions: ["team_dashboard.view"] },
      { path: "/activity-calendar", label: "Activity calendar", icon: <CalendarOutlined />, permissions: ["activities.view"] },
      { path: "/expenses", label: "Expenses", icon: <WalletOutlined />, permissions: ["expense_claims.view"] },
      { path: "/leave", label: "Leave", icon: <ClockCircleOutlined />, permissions: ["leave_requests.view"] },
    ],
  },
  {
    groupLabel: "Sales force",
    items: [
      {
        path: "/sales-force-management",
        label: "Sales force management",
        icon: <ClusterOutlined />,
        // Mirrors SalesForceManagementPage's own per-tab `visible:` checks -
        // stays visible as long as at least one of its tabs would show data.
        permissions: [
          "users.view", "offices.view", "role_permissions.view", "manager_change_log.view",
          "approval_bands.view", "targets.view", "levels.view",
        ],
      },
    ],
  },
  {
    groupLabel: "Govern",
    items: [
      {
        path: "/approvals",
        label: "Approvals",
        icon: <CheckCircleOutlined />,
        // The 2 real approval queues the page lists: expense and leave.
        permissions: ["expense_claims.approve", "leave_requests.approve"],
      },
      { path: "/reports", label: "Reports", icon: <FileTextOutlined />, permissions: ["reports.view"] },
      { path: "/audit-consent", label: "Audit & consent", icon: <SafetyCertificateOutlined />, permissions: ["audit_log.view"] },
      {
        path: "/settings",
        label: "Settings",
        icon: <SettingOutlined />,
        // Settings' own tabs, gated on the permission that actually means
        // "can configure this," not just "can read this." whatsapp.view,
        // pipeline_stages.view, lead_categories.view, message_templates.view
        // and leave_types.view are all deliberately NOT here even though
        // Settings has tabs for each of those areas - every one of those
        // five `.view` permissions is also held broadly for a completely
        // ordinary, unrelated reason (seeing WhatsApp messages on your own
        // leads, Stage/Category labels shown throughout the Leads UI,
        // picking a message template when messaging a lead, reading leave
        // types to populate your own leave request's dropdown) - so Call
        // Center and Field Sales Executive both ended up landing on
        // Settings and hitting a 403 on every tab they opened, same root
        // cause each time. Nothing here is reachable by holding only a read
        // permission needed for normal app usage - only the remaining
        // permissions below are safe because nothing outside Settings
        // itself ever needs them.
        permissions: SETTINGS_PERMISSIONS,
      },
    ],
  },
];

export const ALL_NAV_LEAVES: NavLeaf[] = NAV_GROUPS.flatMap((group) => group.items);
