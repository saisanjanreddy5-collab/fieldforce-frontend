import {
  AimOutlined,
  AppstoreOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ClusterOutlined,
  CodeOutlined,
  DashboardOutlined,
  ExportOutlined,
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
}

export interface NavGroup {
  groupLabel: string;
  items: NavLeaf[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    groupLabel: "Sell",
    items: [
      { path: "/", label: "Dashboard", icon: <DashboardOutlined />, built: true },
      { path: "/leads", label: "Leads", icon: <AimOutlined />, built: true },
      { path: "/opportunities", label: "Opportunities", icon: <TableOutlined /> },
      { path: "/fofo-onboarding", label: "FOFO onboarding", icon: <ExportOutlined /> },
    ],
  },
  {
    groupLabel: "Relate",
    items: [
      { path: "/customers", label: "Customers", icon: <GlobalOutlined /> },
      { path: "/call-center", label: "Call center", icon: <PhoneOutlined /> },
      { path: "/support-tickets", label: "Support tickets", icon: <TagsOutlined /> },
    ],
  },
  {
    groupLabel: "Team",
    items: [
      { path: "/team/dashboard", label: "Dashboard", icon: <AppstoreOutlined /> },
      { path: "/activity-calendar", label: "Activity calendar", icon: <CalendarOutlined /> },
      { path: "/expenses", label: "Expenses", icon: <WalletOutlined /> },
      { path: "/leave", label: "Leave", icon: <ClockCircleOutlined /> },
    ],
  },
  {
    groupLabel: "Sales force",
    items: [{ path: "/sales-force-management", label: "Sales force management", icon: <ClusterOutlined /> }],
  },
  {
    groupLabel: "Govern",
    items: [
      { path: "/approvals", label: "Approvals", icon: <CheckCircleOutlined /> },
      { path: "/reports", label: "Reports", icon: <FileTextOutlined /> },
      { path: "/audit-consent", label: "Audit & consent", icon: <SafetyCertificateOutlined /> },
      { path: "/settings", label: "Settings", icon: <SettingOutlined /> },
      { path: "/dev-handoff", label: "Dev handoff", icon: <CodeOutlined /> },
    ],
  },
];

export const ALL_NAV_LEAVES: NavLeaf[] = NAV_GROUPS.flatMap((group) => group.items);
