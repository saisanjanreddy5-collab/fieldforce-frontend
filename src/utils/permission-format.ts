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
  structure_axis: "Levels & axes",
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
  app_settings: "App settings",
  assignment_rules: "Assignment rules",
  audit_log: "Audit log",
  comp_off_credits: "Comp-off credits",
  expense_claims: "Expense claims",
  expense_types: "Expense types",
  fofo_onboarding: "FOFO onboarding",
  lead_categories: "Lead categories",
  leave_requests: "Leave requests",
  leave_types: "Leave types",
  message_templates: "Message templates",
  pipeline_stages: "Pipeline stages",
  qr_campaigns: "QR campaigns",
  reports: "Reports",
  team_dashboard: "Team dashboard",
  website_lead_sources: "Website lead sources",
  whatsapp: "WhatsApp",
  user_commissions: "User commissions",
  customers: "Customers",
  call_center: "Call center",
  support_tickets: "Support tickets",
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
