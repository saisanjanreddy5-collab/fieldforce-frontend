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
  /** Only "/" (Dashboard) is a real, built page for now - the rest render a "Coming soon" placeholder. */
  built?: boolean;
  /**
   * Which real permissions make this item visible - OR semantics: holding
   * any one of them is enough (a multi-tab page like Sales force management
   * lists every one of its own tabs' view permissions, so the nav item stays
   * visible as long as at least one tab would render something).
   */
  permissions?: string[];
}

export interface NavGroup {
  groupLabel: string;
  items: NavLeaf[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    groupLabel: "Sell",
    items: [
      { path: "/", label: "Dashboard", icon: <DashboardOutlined />, built: true, permissions: ["dashboard.view"] },
      { path: "/leads", label: "Leads", icon: <AimOutlined />, built: true, permissions: ["leads.view"] },
      { path: "/opportunities", label: "Opportunities", icon: <TableOutlined />, built: true, permissions: ["opportunities.view"] },
      { path: "/quotes", label: "Quotes", icon: <FileDoneOutlined />, built: true, permissions: ["quotes.view"] },
      { path: "/fofo-onboarding", label: "FOFO onboarding", icon: <ExportOutlined />, built: true, permissions: ["fofo_onboarding.view"] },
    ],
  },
  {
    groupLabel: "Relate",
    items: [
      // Still "Coming soon" pages (see ComingSoonPage/App.tsx) - but the
      // permissions behind them are real and configurable now, so access is
      // already correct for whoever ends up building the page next.
      { path: "/customers", label: "Customers", icon: <GlobalOutlined />, permissions: ["customers.view"] },
      { path: "/call-center", label: "Call center", icon: <PhoneOutlined />, permissions: ["call_center.view"] },
      { path: "/support-tickets", label: "Support tickets", icon: <TagsOutlined />, permissions: ["support_tickets.view"] },
    ],
  },
  {
    groupLabel: "Team",
    items: [
      { path: "/team/dashboard", label: "Dashboard", icon: <AppstoreOutlined />, built: true, permissions: ["team_dashboard.view"] },
      { path: "/activity-calendar", label: "Activity calendar", icon: <CalendarOutlined />, built: true, permissions: ["activities.view"] },
      { path: "/expenses", label: "Expenses", icon: <WalletOutlined />, built: true, permissions: ["expense_claims.view"] },
      { path: "/leave", label: "Leave", icon: <ClockCircleOutlined />, built: true, permissions: ["leave_requests.view"] },
    ],
  },
  {
    groupLabel: "Sales force",
    items: [
      {
        path: "/sales-force-management",
        label: "Sales force management",
        icon: <ClusterOutlined />,
        built: true,
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
        built: true,
        // The 3 real approval queues the page lists: expense, leave, FOFO onboarding push.
        permissions: ["expense_claims.approve", "leave_requests.approve", "fofo_onboarding.manage"],
      },
      { path: "/reports", label: "Reports", icon: <FileTextOutlined />, built: true, permissions: ["reports.view"] },
      { path: "/audit-consent", label: "Audit & consent", icon: <SafetyCertificateOutlined />, built: true, permissions: ["audit_log.view"] },
      {
        path: "/settings",
        label: "Settings",
        icon: <SettingOutlined />,
        built: true,
        // Every tab Settings actually has: stages, categories, assignment
        // rules, approval bands, app settings, templates, leave types, QR
        // capture, WhatsApp, users & access.
        permissions: [
          "pipeline_stages.view", "lead_categories.view", "assignment_rules.view", "approval_bands.view",
          "app_settings.view", "message_templates.view", "leave_types.view", "qr_campaigns.view",
          "whatsapp.view", "users.view",
        ],
      },
    ],
  },
];

export const ALL_NAV_LEAVES: NavLeaf[] = NAV_GROUPS.flatMap((group) => group.items);
