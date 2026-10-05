export const MODULE_LABELS: Record<string, string> = {
  users: "Users",
  leads: "Leads",
  opportunities: "Opportunities",
  activities: "Activities",
  attendance: "Attendance",
  dashboard: "Dashboard",
  offices: "Offices",
  levels: "Levels",
  sales_teams: "Sales teams",
  targets: "Targets",
  incentive_plans: "Incentive plans",
  commission_rules: "Commission rules",
  role_permissions: "Role permissions",
  user_permission_overrides: "Per-employee overrides",
  manager_change_log: "Reporting lines",
  approval_bands: "Approval bands",
  territory_transfers: "Territory transfers",
  delegations: "Cover & delegation",
  quotes: "Quotes",
};

function moduleOf(permission: string): string {
  return permission.split(".")[0];
}

export function verbOf(permission: string): string {
  return permission.split(".").slice(1).join(".");
}

export function modulesOf(catalog: string[]): string[] {
  return Array.from(new Set(catalog.map(moduleOf)));
}
