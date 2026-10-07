import { forwardRef, useEffect, useMemo, useState } from "react";
import { Card, Input, Modal, Popconfirm, Segmented, Switch, Table, Tag, Tooltip, Typography, message } from "antd";
import { CheckOutlined, CloseOutlined, MinusOutlined, PlusOutlined } from "@ant-design/icons";
import * as rolePermissionApi from "../api/role-permission-api";
import * as overrideApi from "../api/user-permission-override-api";
import * as levelApi from "../api/level-api";
import type { RolePermissionMatrix } from "../types/role-permission";
import type { UserPermissionOverride } from "../types/user-permission-override";
import type { TeamMember } from "../types/user";
import type { Level } from "../types/level";
import { useHasPermission } from "../hooks/use-permission";
import { verbOf } from "../utils/permission-format";
import { RECORD_SCOPE_OPTIONS, ladderIndex, seesLabel } from "../utils/level-format";
import { appTokens } from "../utils/design-system";

const { Text } = Typography;

// Exactly which individual permissions requirePermission actually consults
// today - leads/opportunities/activities from Phase 3C, plus role_permissions
// .view, user_permission_overrides.view, manager_change_log.view,
// territory_transfers.*, delegations.* and every approval_bands verb from
// the post-Phase-3 retrofit (role_permissions.update and
// user_permission_overrides.create/.delete deliberately stay on
// requireRole(ADMIN_ONLY) - see role-permission-routes.ts - so they're left
// out here on purpose). Everything else still checks requireRole directly,
// so toggling those here only changes what this screen displays, not what
// the backend enforces.
const ENFORCED_PERMISSIONS = new Set([
  "leads.view", "leads.create", "leads.update", "leads.delete", "leads.share",
  "opportunities.view", "opportunities.create", "opportunities.update", "opportunities.delete",
  "activities.view", "activities.create", "activities.update", "activities.delete",
  "role_permissions.view",
  "user_permission_overrides.view",
  "manager_change_log.view",
  "approval_bands.view", "approval_bands.create", "approval_bands.update", "approval_bands.delete",
  "territory_transfers.view", "territory_transfers.create",
  "delegations.view", "delegations.create", "delegations.delete",
]);

const VERB_ORDER = ["view", "create", "update", "delete", "share", "approve", "export", "view_own", "view_team"];
const VERB_LABELS: Record<string, string> = {
  view: "View",
  create: "Create",
  update: "Edit",
  delete: "Delete",
  share: "Share",
  approve: "Approve",
  export: "Export",
  view_own: "View own",
  view_team: "View team",
};

interface ModuleGroup {
  label: string;
  scopeHint: string;
  modules: string[];
}

// One row per real nav item (see nav-config.tsx's NAV_GROUPS) - not a
// logical regrouping, a literal 1:1 mirror of the 17 things in the sidebar,
// so "what can this role see in the CRM" and "what's configurable here"
// are the exact same list. A row's modules are every permission-bearing
// module that page's own code actually touches (confirmed by reading each
// page/card's real API calls, not guessed) - Sales force management and
// Settings legitimately bundle many modules because that's what's really
// behind those two nav items; a module can appear in more than one row
// when a real permission is genuinely used in both places (e.g.
// approval_bands is real content on both pages). Every checkbox still maps
// to a real, individually-toggleable permission - a row's checkbox just
// batch-applies to every real permission in it at once (same "shared tier"
// pattern already used for levels that share one security tier).
//
// scopeHint is read off the actual service-layer query, not guessed:
// leads/opportunities/activities/quotes/customers/call_center use the
// manager-subtree CTE (own + below); expense_claims/leave_requests/
// comp_off_credits/support_tickets/approvals use a direct manager_id match
// only, one level deep (own + team); reports uses the same subtree CTE,
// phrased "own tree" to match report-service.ts's own comment; audit_log
// has no create/update/delete path for anyone, ever (read-only); Sales
// force management and Settings are unscoped admin/config tables with no
// owner column at all.
const MODULE_GROUPS: ModuleGroup[] = [
  { label: "Dashboard", scopeHint: "own + below", modules: ["dashboard"] },
  { label: "Leads", scopeHint: "own + below", modules: ["leads", "whatsapp"] },
  { label: "Opportunities", scopeHint: "own + below", modules: ["opportunities"] },
  { label: "Quotes", scopeHint: "own + below", modules: ["quotes"] },
  { label: "FOFO onboarding", scopeHint: "own + below", modules: ["fofo_onboarding"] },
  // Authorization-only for now - the pages behind these 3 are still
  // "Coming soon" placeholders (see nav-config.tsx), but who will be able to
  // see them once built is already real and configurable here.
  { label: "Customers", scopeHint: "own + below", modules: ["customers"] },
  { label: "Call center", scopeHint: "own + below", modules: ["call_center"] },
  { label: "Support tickets", scopeHint: "own + team", modules: ["support_tickets"] },
  { label: "Team dashboard", scopeHint: "own + below", modules: ["team_dashboard", "attendance"] },
  { label: "Activity calendar", scopeHint: "own + below", modules: ["activities"] },
  { label: "Expenses", scopeHint: "own + team", modules: ["expense_claims", "expense_types"] },
  { label: "Leave", scopeHint: "own + team", modules: ["leave_requests", "leave_types", "comp_off_credits"] },
  {
    label: "Sales force management",
    scopeHint: "config",
    modules: [
      "users", "offices", "levels", "structure_axis", "sales_teams", "targets", "role_permissions",
      "user_permission_overrides", "manager_change_log", "approval_bands", "incentive_plans", "commission_rules",
      "user_commissions", "territory_transfers", "delegations",
    ],
  },
  {
    label: "Approvals",
    scopeHint: "own + team",
    modules: ["expense_claims", "leave_requests", "fofo_onboarding"],
  },
  { label: "Reports", scopeHint: "own tree", modules: ["reports"] },
  { label: "Audit & consent", scopeHint: "read-only", modules: ["audit_log"] },
  {
    label: "Settings",
    scopeHint: "config",
    modules: [
      "pipeline_stages", "lead_categories", "assignment_rules", "approval_bands", "app_settings",
      "message_templates", "leave_types", "qr_campaigns", "website_lead_sources", "users",
    ],
  },
];

function permsFor(group: ModuleGroup, verb: string, catalog: string[]): string[] {
  const set = new Set(catalog);
  return group.modules.map((m) => `${m}.${verb}`).filter((p) => set.has(p));
}

// Generalizes the old single-permission granted-vs-default comparison to a
// whole group at once: "on" is whatever's live right now (a role grant, or
// an employee's effective access), "isBaseline" is whatever it'd be with no
// edits (the role default, or the role grant with no override). Mixed only
// fires when the group's real permissions genuinely disagree with each
// other for this role/employee - never papered over as a clean check or
// dash, since that would misreport what's actually granted.
function aggregateCellState(flags: { on: boolean; isBaseline: boolean }[]): CellState {
  if (flags.length === 0) return "na";
  const onCount = flags.filter((f) => f.on).length;
  const baselineCount = flags.filter((f) => f.isBaseline).length;
  const allOn = onCount === flags.length;
  const noneOn = onCount === 0;
  const allBaseline = baselineCount === flags.length;
  const noneBaseline = baselineCount === 0;
  if (!allOn && !noneOn) return "mixed";
  if (allOn && allBaseline) return "granted";
  if (noneOn && noneBaseline) return "not-granted";
  if (allOn && !allBaseline) return "extra-grant";
  return "revoked";
}

// Deterministic so the same person always gets the same color across
// renders/sessions, without storing anything - purely decorative, same idea
// as initials-avatars anywhere else in the app.
const AVATAR_COLORS = ["#1354e0", "#7c3aed", "#059669", "#d97706", "#dc2626", "#0891b2", "#be185d", "#4f46e5"];
function avatarColorFor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}
function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}

function allVerbsIn(catalog: string[]): string[] {
  const found = new Set(catalog.map(verbOf));
  return VERB_ORDER.filter((v) => found.has(v));
}

interface PermissionsCardProps {
  users: TeamMember[];
  levels: Level[];
  onLevelsChange?: (levels: Level[]) => void;
}

type OverrideAction = { permissions: string[]; label: string; kind: "grant" | "revoke" | "clear"; overrideIds?: string[] };

type CellState = "na" | "granted" | "not-granted" | "extra-grant" | "revoked" | "mixed";

// forwardRef is load-bearing, not cosmetic: Popconfirm clones its child to
// attach a ref it uses to measure/position the confirmation popup. A plain
// function component silently drops that ref (React can't attach refs to
// function components), so Popconfirm never gets a real DOM node to align
// against and the popup stays parked at its pre-measurement off-screen
// staging position (rc-trigger's `inset: -1000vh auto auto -1000vw`)
// forever - clicking the cell looked like it did nothing. Confirmed by
// comparing against the "Reset role to default" Popconfirm on this same
// page, which wraps a real antd <Tag> (ref-forwarding) and has always
// positioned correctly.
const Cell = forwardRef<HTMLSpanElement, { state: CellState; onClick?: () => void; tooltip?: string }>(function Cell(
  { state, onClick, tooltip },
  ref
) {
  // Binary only, by design - "granted" means every real permission in this
  // row is on, anything less (including "mixed", where a merged row's bundled
  // modules genuinely disagree per role) reads as the same plain dash as
  // "not granted". It never overclaims a full grant that isn't really there;
  // the exact split (e.g. "6 of 21 granted") is still available on hover via
  // the tooltip, just not as a third symbol cluttering the grid.
  const icon =
    state === "na" ? (
      <MinusOutlined style={{ color: "#d9d9d9" }} />
    ) : state === "granted" || state === "extra-grant" ? (
      <CheckOutlined style={{ color: state === "extra-grant" ? appTokens.purple : appTokens.success }} />
    ) : state === "revoked" ? (
      <CloseOutlined style={{ color: appTokens.danger }} />
    ) : (
      <MinusOutlined style={{ color: "#bfbfbf" }} />
    );
  const content = (
    <span
      ref={ref}
      style={{ display: "inline-block", cursor: onClick ? "pointer" : "default", padding: onClick ? "0 6px" : 0 }}
      onClick={onClick}
    >
      {icon}
    </span>
  );
  return tooltip ? <Tooltip title={tooltip}>{content}</Tooltip> : content;
});

// Two modes sharing one table shape: "By role" edits the real
// role_permissions baseline (grouped under Levels now, per the user's
// decision to keep the real 3-tier security model with these as richer
// display labels - several levels share one tier, so toggling one toggles
// all of them together, called out in the header when that's the case).
// "By employee" shows the 4-state effective view (From role / Extra grant
// / Revoked / Not allowed) on top of that baseline via
// user_permission_overrides, foundation only exactly as before.
export function PermissionsCard({ users, levels, onLevelsChange }: PermissionsCardProps) {
  const hasPermission = useHasPermission();
  const canManageRoles = hasPermission("role_permissions.update");
  const canManageOverrides = hasPermission("user_permission_overrides.create");

  const [mode, setMode] = useState<"role" | "employee">("role");
  const [matrix, setMatrix] = useState<RolePermissionMatrix | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedLevelId, setSelectedLevelId] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [overrides, setOverrides] = useState<UserPermissionOverride[]>([]);
  const [search, setSearch] = useState("");
  const [action, setAction] = useState<OverrideAction | null>(null);
  const [reason, setReason] = useState("");

  const loadMatrix = () => {
    setLoading(true);
    rolePermissionApi
      .getRolePermissionMatrix()
      .then(setMatrix)
      .catch(() => message.error("Failed to load permissions"))
      .finally(() => setLoading(false));
  };

  useEffect(loadMatrix, []);

  useEffect(() => {
    if (!selectedLevelId && levels.length > 0) setSelectedLevelId(levels[0].id);
  }, [levels, selectedLevelId]);

  const loadOverrides = (userId: string) => {
    overrideApi
      .listOverridesForUser(userId)
      .then(setOverrides)
      .catch(() => message.error("Failed to load overrides"));
  };

  useEffect(() => {
    if (mode === "employee" && selectedUserId && canManageOverrides) loadOverrides(selectedUserId);
  }, [mode, selectedUserId, canManageOverrides]);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
  }, [users, search]);

  const selectedUser = users.find((u) => u.id === selectedUserId) ?? null;
  const selectedLevel = levels.find((l) => l.id === selectedLevelId) ?? null;
  const activeOverrides = overrides.filter((o) => !o.clearedAt);
  const overrideFor = (permission: string) => activeOverrides.find((o) => o.permission === permission);

  const verbs = useMemo(() => (matrix ? allVerbsIn(matrix.catalog) : []), [matrix]);

  const grantsForSelectedTier = selectedLevel ? matrix?.grants[selectedLevel.securityTier] ?? [] : [];
  const levelsSharingTier = selectedLevel ? levels.filter((l) => l.id !== selectedLevel.id && l.securityTier === selectedLevel.securityTier) : [];
  const topLadderSortOrder = useMemo(() => {
    const ladder = levels.filter((l) => !l.isCrossCutting).map((l) => l.sortOrder);
    return ladder.length === 0 ? null : Math.min(...ladder);
  }, [levels]);

  const TIER_COLORS: Record<string, string> = { admin: appTokens.purple, manager: appTokens.primary, agent: appTokens.success };

  const toggleRolePermission = async (permission: string, currentlyGranted: boolean) => {
    if (!selectedLevel) return;
    try {
      const updated = await rolePermissionApi.setRolePermission(selectedLevel.securityTier, permission, !currentlyGranted);
      setMatrix(updated);
      message.success(`${permission} ${!currentlyGranted ? "granted to" : "revoked from"} the ${selectedLevel.securityTier} tier`);
    } catch {
      message.error("Failed to update role permission");
    }
  };

  // Sequential, not Promise.all - each call re-reads the whole table server
  // side, so firing them concurrently risks one write's read missing
  // another's not-yet-committed write. A handful of single-row INSERT/DELETE
  // statements in a row is fast enough that this is never user-visible.
  const toggleGroupPermission = async (group: ModuleGroup, perms: string[], grant: boolean) => {
    if (!selectedLevel) return;
    try {
      let updated: RolePermissionMatrix | null = null;
      for (const p of perms) {
        updated = await rolePermissionApi.setRolePermission(selectedLevel.securityTier, p, grant);
      }
      if (updated) setMatrix(updated);
      message.success(
        `${perms.length} permission${perms.length === 1 ? "" : "s"} under ${group.label} ${grant ? "granted to" : "revoked from"} the ${selectedLevel.securityTier} tier`
      );
    } catch {
      message.error("Failed to update role permissions");
    }
  };

  const updateLevelField = async (field: keyof Level, value: unknown) => {
    if (!selectedLevel) return;
    try {
      const updated = await levelApi.updateLevel(selectedLevel.id, { [field]: value });
      onLevelsChange?.(levels.map((l) => (l.id === updated.id ? updated : l)));
    } catch {
      message.error("Failed to update level");
    }
  };

  // Picks exactly which real permissions need to change, so the override we
  // create always matches what clicking the cell visually promised -
  // "clear" wins whenever any member of the group already has an override
  // (reverting the whole group to the role baseline); otherwise "revoke"
  // only touches the role-granted members and "grant" only the ungranted
  // ones, never both.
  const openGroupAction = (perms: string[], label: string) => {
    setReason("");
    const existing = perms.map((p) => overrideFor(p)).filter((o): o is UserPermissionOverride => Boolean(o));
    if (existing.length > 0) {
      setAction({ permissions: existing.map((o) => o.permission), label, kind: "clear", overrideIds: existing.map((o) => o.id) });
      return;
    }
    const roleGrantedPerms = perms.filter((p) => (selectedUser ? matrix?.grants[selectedUser.role]?.includes(p) ?? false : false));
    const notGrantedPerms = perms.filter((p) => !roleGrantedPerms.includes(p));
    if (roleGrantedPerms.length > 0 && roleGrantedPerms.length >= notGrantedPerms.length) {
      setAction({ permissions: roleGrantedPerms, label, kind: "revoke" });
    } else {
      setAction({ permissions: notGrantedPerms, label, kind: "grant" });
    }
  };

  const submitAction = async () => {
    if (!action || !selectedUserId) return;
    try {
      if (action.kind === "clear") {
        for (const id of action.overrideIds ?? []) await overrideApi.clearOverride(id);
        message.success("Override cleared");
      } else {
        for (const p of action.permissions) {
          await overrideApi.createOverride({
            userId: selectedUserId,
            permission: p,
            grantType: action.kind === "grant" ? "grant" : "revoke",
            reason: reason || undefined,
          });
        }
        message.success(action.kind === "grant" ? "Extra access granted" : "Access revoked for this person");
      }
      setAction(null);
      loadOverrides(selectedUserId);
    } catch {
      message.error("Failed to update override");
    }
  };

  const singleEmployeeGranted = (permission: string): boolean => {
    const roleGranted = selectedUser ? matrix?.grants[selectedUser.role]?.includes(permission) ?? false : false;
    const override = overrideFor(permission);
    if (override?.grantType === "grant") return true;
    if (override?.grantType === "revoke") return false;
    return roleGranted;
  };

  const roleGroupCellState = (group: ModuleGroup, verb: string): CellState => {
    if (!matrix) return "na";
    const perms = permsFor(group, verb, matrix.catalog);
    if (perms.length === 0) return "na";
    if (!selectedLevel) return "not-granted";
    const flags = perms.map((p) => ({
      on: grantsForSelectedTier.includes(p),
      isBaseline: matrix.defaults[selectedLevel.securityTier]?.includes(p) ?? false,
    }));
    return aggregateCellState(flags);
  };

  const employeeGroupCellState = (group: ModuleGroup, verb: string): CellState => {
    if (!matrix || !selectedUser) return "na";
    const perms = permsFor(group, verb, matrix.catalog);
    if (perms.length === 0) return "na";
    const flags = perms.map((p) => {
      const roleGranted = matrix.grants[selectedUser.role]?.includes(p) ?? false;
      return { on: singleEmployeeGranted(p), isBaseline: roleGranted };
    });
    return aggregateCellState(flags);
  };

  const mixedTooltip = (state: CellState, perms: string[], onCount: number): string | undefined =>
    state === "mixed" ? `${onCount} of ${perms.length} granted` : undefined;

  const bulkReassignGranted = grantsForSelectedTier.includes("leads.update");
  const employeeBulkReassignGranted = singleEmployeeGranted("leads.update");

  const tableColumns = [
    {
      title: "Module",
      key: "module",
      render: (_: unknown, group: ModuleGroup) => (
        <div>
          <Text strong>{group.label}</Text>
          <div>
            <Text type="secondary" style={{ fontSize: 11 }}>
              {group.scopeHint}
            </Text>
          </div>
        </div>
      ),
    },
    ...verbs.map((verb) => ({
      title: VERB_LABELS[verb] ?? verb,
      key: verb,
      align: "center" as const,
      render: (_: unknown, group: ModuleGroup) => {
        if (!matrix) return null;
        const perms = permsFor(group, verb, matrix.catalog);
        if (mode === "role") {
          const state = roleGroupCellState(group, verb);
          if (state === "na" || !canManageRoles) {
            return <Cell state={state} tooltip={mixedTooltip(state, perms, perms.filter((p) => grantsForSelectedTier.includes(p)).length)} />;
          }
          const shouldGrant = !(state === "granted" || state === "extra-grant");
          const enforcedCount = perms.filter((p) => ENFORCED_PERMISSIONS.has(p)).length;
          const description =
            enforcedCount === perms.length
              ? "This takes effect immediately."
              : enforcedCount === 0
                ? "These modules still check a fixed role, not this table - this only changes what this screen displays."
                : `${enforcedCount} of ${perms.length} take effect immediately - the rest still check a fixed role, not this table.`;
          return (
            <Popconfirm
              title={`${shouldGrant ? "Grant" : "Revoke"} ${perms.length} permission${perms.length === 1 ? "" : "s"} under ${group.label} - ${VERB_LABELS[verb] ?? verb} ${shouldGrant ? "to" : "from"} the ${selectedLevel?.securityTier} tier?`}
              description={description}
              onConfirm={() => toggleGroupPermission(group, perms, shouldGrant)}
            >
              <Cell state={state} tooltip={mixedTooltip(state, perms, perms.filter((p) => grantsForSelectedTier.includes(p)).length)} />
            </Popconfirm>
          );
        }
        const state = employeeGroupCellState(group, verb);
        const onCount = perms.filter((p) => singleEmployeeGranted(p)).length;
        if (state === "na" || !canManageOverrides) return <Cell state={state} tooltip={mixedTooltip(state, perms, onCount)} />;
        return (
          <Cell
            state={state}
            tooltip={mixedTooltip(state, perms, onCount)}
            onClick={() => openGroupAction(perms, `${group.label} - ${VERB_LABELS[verb] ?? verb}`)}
          />
        );
      },
    })),
  ];

  return (
    <Card size="small" style={{ marginBottom: 16, borderColor: appTokens.border, boxShadow: appTokens.shadowSm }} loading={loading}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, flexWrap: "wrap", gap: 8 }}>
        <div>
          <Text strong>Permissions</Text>
          <div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {mode === "role"
                ? "Changes apply to everyone holding this role"
                : "Employee overrides sit on top of the role baseline - grants in violet, revokes in red"}
            </Text>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Segmented
            size="small"
            value={mode}
            onChange={(v) => setMode(v as "role" | "employee")}
            options={[
              { value: "role", label: "By role" },
              { value: "employee", label: "By employee" },
            ]}
          />
          {mode === "role" && (
            <Popconfirm
              title={`Reset ${selectedLevel?.securityTier ?? "this"} tier to its default permissions?`}
              description="Discards every grant/revoke made from this screen for the whole tier."
              disabled={!selectedLevel || !canManageRoles}
              onConfirm={async () => {
                if (!selectedLevel) return;
                try {
                  const updated = await rolePermissionApi.resetRoleToDefault(selectedLevel.securityTier);
                  setMatrix(updated);
                  message.success(`${selectedLevel.securityTier} tier reset to default`);
                } catch {
                  message.error("Failed to reset role");
                }
              }}
            >
              <Tag
                style={{
                  cursor: !selectedLevel || !canManageRoles ? "not-allowed" : "pointer",
                  opacity: !selectedLevel || !canManageRoles ? 0.5 : 1,
                }}
              >
                Reset role to default
              </Tag>
            </Popconfirm>
          )}
          {mode === "employee" && (
            <Popconfirm
              title="Clear every active override for this person?"
              disabled={!selectedUser || activeOverrides.length === 0}
              onConfirm={async () => {
                if (!selectedUser) return;
                try {
                  const count = await overrideApi.clearAllOverridesForUser(selectedUser.id);
                  message.success(`Cleared ${count} override${count === 1 ? "" : "s"}`);
                  loadOverrides(selectedUser.id);
                } catch {
                  message.error("Failed to clear overrides");
                }
              }}
            >
              <Tag
                style={{
                  cursor: !selectedUser || activeOverrides.length === 0 ? "not-allowed" : "pointer",
                  opacity: !selectedUser || activeOverrides.length === 0 ? 0.5 : 1,
                }}
              >
                Clear overrides
              </Tag>
            </Popconfirm>
          )}
        </div>
      </div>

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        <div style={{ flex: "0 0 200px" }}>
          {mode === "role" ? (
            <div style={{ maxHeight: 400, overflowY: "auto" }}>
              {levels.map((l) => (
                <div
                  key={l.id}
                  onClick={() => setSelectedLevelId(l.id)}
                  style={{
                    padding: "6px 10px",
                    borderRadius: 6,
                    cursor: "pointer",
                    marginBottom: 4,
                    background: selectedLevelId === l.id ? appTokens.primarySoft : "transparent",
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: selectedLevelId === l.id ? 600 : 400, display: "block" }}>{l.name}</Text>
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    L{ladderIndex(l, levels)} · {seesLabel(l, l.sortOrder === topLadderSortOrder)}
                  </Text>
                </div>
              ))}
            </div>
          ) : (
            <>
              <Input.Search placeholder="Search people" value={search} onChange={(e) => setSearch(e.target.value)} allowClear style={{ marginBottom: 8 }} />
              <div style={{ maxHeight: 360, overflowY: "auto" }}>
                {filteredUsers.map((u) => (
                  <div
                    key={u.id}
                    onClick={() => setSelectedUserId(u.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "6px 10px",
                      borderRadius: 6,
                      cursor: "pointer",
                      marginBottom: 2,
                      background: selectedUserId === u.id ? appTokens.primarySoft : "transparent",
                    }}
                  >
                    <div
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: "50%",
                        flexShrink: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: avatarColorFor(u.id),
                        color: "#fff",
                        fontSize: 11,
                        fontWeight: 600,
                      }}
                    >
                      {initialsOf(u.name)}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <Text strong style={{ fontSize: 13, display: "block" }}>
                        {u.name}
                      </Text>
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        {levels.find((l) => l.id === u.levelId)?.name ?? u.role}
                      </Text>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div style={{ flex: "1 1 500px", minWidth: 320 }}>
          {mode === "role" ? (
            selectedLevel && (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: TIER_COLORS[selectedLevel.securityTier], flexShrink: 0 }} />
                  <Text strong>{selectedLevel.name}</Text>
                </div>
                <div style={{ marginBottom: 8 }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Baseline for {selectedLevel.currentHeadcount} user{selectedLevel.currentHeadcount === 1 ? "" : "s"} · scope:{" "}
                    {seesLabel(selectedLevel, selectedLevel.sortOrder === topLadderSortOrder)}
                    {levelsSharingTier.length > 0 && (
                      <> · shared with {levelsSharingTier.map((l) => l.name).join(", ")} - changing this changes it for all of them</>
                    )}
                  </Text>
                </div>
                <Table
                  size="small"
                  rowKey={(group) => (group as ModuleGroup).label}
                  dataSource={MODULE_GROUPS}
                  pagination={false}
                  columns={tableColumns}
                  scroll={{ x: "max-content" }}
                />
                <div style={{ marginTop: 8 }}>
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    <CheckOutlined style={{ color: appTokens.success }} /> From role &nbsp; <MinusOutlined /> Not allowed &nbsp;
                    <CheckOutlined style={{ color: appTokens.purple }} /> Edited &nbsp;
                    <MinusOutlined style={{ color: appTokens.danger }} /> Turned off
                  </Text>
                </div>

                <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 16 }}>
                  <Card size="small" style={{ flex: "1 1 280px", minWidth: 240, borderColor: appTokens.border }}>
                    <Text strong style={{ display: "block", marginBottom: 2 }}>
                      Record scope
                    </Text>
                    <Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 8 }}>
                      Which rows they reach, before column rules apply - configuration only for now, the real
                      leads/opportunities/activities visibility still uses the manager-subtree rule underneath
                    </Text>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      {RECORD_SCOPE_OPTIONS.map((opt) => (
                        <div
                          key={opt.value}
                          onClick={() => canManageRoles && updateLevelField("recordScope", opt.value)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            padding: "4px 8px",
                            borderRadius: 6,
                            cursor: canManageRoles ? "pointer" : "default",
                            background: selectedLevel.recordScope === opt.value ? appTokens.primarySoft : "transparent",
                          }}
                        >
                          <input type="radio" readOnly checked={selectedLevel.recordScope === opt.value} />
                          <div>
                            <Text style={{ fontSize: 13 }}>{opt.label}</Text>
                            <div>
                              <Text type="secondary" style={{ fontSize: 11 }}>
                                {opt.description}
                              </Text>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>

                  <Card size="small" style={{ flex: "1 1 280px", minWidth: 240, borderColor: appTokens.border }}>
                    <Text strong style={{ display: "block", marginBottom: 2 }}>
                      Field & feature rules
                    </Text>
                    <Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 8 }}>
                      Sensitive columns and privileged actions
                    </Text>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <Text style={{ fontSize: 13 }}>Bulk re-assign records</Text>
                          <div>
                            <Text type="secondary" style={{ fontSize: 11 }}>
                              Move a book of business between people - same as Leads &rarr; Edit above
                            </Text>
                          </div>
                        </div>
                        <Switch checked={bulkReassignGranted} disabled={!canManageRoles} onChange={(v) => toggleRolePermission("leads.update", !v)} />
                      </div>
                      {(
                        [
                          { key: "seeCreditFields", label: "See customer credit and exposure", desc: "Credit limit, overdue and exposure columns" },
                          { key: "seeMarginFields", label: "See margin and cost fields", desc: "Landed cost, margin slab, net margin" },
                          { key: "canExport", label: "Export to Excel / CSV", desc: "Any list view, watermarked with the user id" },
                          { key: "canViewCallRecordings", label: "View call recordings", desc: "Own team only, logged in the audit trail" },
                          { key: "canSeeUnmaskedPii", label: "See personal data unmasked", desc: "Phone and email in full, DPDP logged" },
                        ] as const
                      ).map((f) => (
                        <div key={f.key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div>
                            <Text style={{ fontSize: 13 }}>{f.label}</Text>
                            <div>
                              <Text type="secondary" style={{ fontSize: 11 }}>
                                {f.desc}
                              </Text>
                            </div>
                          </div>
                          <Switch
                            checked={selectedLevel[f.key]}
                            disabled={!canManageRoles}
                            onChange={(v) => updateLevelField(f.key, v)}
                          />
                        </div>
                      ))}
                    </div>
                    <Text type="secondary" style={{ fontSize: 11, display: "block", marginTop: 8 }}>
                      Configuration only - none of these 5 fields/actions exist anywhere in FieldForce yet, so nothing
                      reads these toggles to actually gate anything. "Bulk re-assign records" is the one real exception -
                      it's the same leads.update permission shown in the table above.
                    </Text>
                  </Card>
                </div>
              </>
            )
          ) : !selectedUser ? (
            <Text type="secondary">Select a person to see their effective permissions</Text>
          ) : !canManageOverrides ? (
            <Text type="secondary">Only an administrator can view or change per-employee overrides.</Text>
          ) : (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: avatarColorFor(selectedUser.id),
                    color: "#fff",
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  {initialsOf(selectedUser.name)}
                </div>
                <div>
                  <Text strong>{selectedUser.name}</Text>
                  <div>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {selectedUser.designation ?? selectedUser.role}
                      {" · "}
                      {levels.find((l) => l.id === selectedUser.levelId)?.name ?? "No level assigned"}
                    </Text>
                  </div>
                </div>
              </div>

              <Table
                size="small"
                rowKey={(group) => (group as ModuleGroup).label}
                dataSource={MODULE_GROUPS}
                pagination={false}
                columns={tableColumns}
                scroll={{ x: "max-content" }}
              />

              <div style={{ marginTop: 8 }}>
                <Text type="secondary" style={{ fontSize: 11 }}>
                  <CheckOutlined style={{ color: appTokens.success }} /> From role &nbsp; <MinusOutlined /> Not allowed &nbsp;
                  <PlusOutlined style={{ color: appTokens.purple }} /> Extra grant &nbsp;
                  <CloseOutlined style={{ color: appTokens.danger }} /> Revoked
                </Text>
              </div>

              {(() => {
                const level = levels.find((l) => l.id === selectedUser.levelId);
                return (
                  <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 16 }}>
                    <div style={{ flex: "1 1 260px", minWidth: 220 }}>
                      <Text strong style={{ display: "block", marginBottom: 4 }}>
                        Record scope
                      </Text>
                      <Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 8 }}>
                        {level ? `Inherited from ${level.name} - change it there, or grant/revoke individual modules above` : "No level assigned"}
                      </Text>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        {RECORD_SCOPE_OPTIONS.map((opt) => (
                          <div
                            key={opt.value}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                              padding: "4px 8px",
                              borderRadius: 6,
                              background: level?.recordScope === opt.value ? appTokens.primarySoft : "transparent",
                            }}
                          >
                            <input type="radio" disabled readOnly checked={level?.recordScope === opt.value} />
                            <div>
                              <Text style={{ fontSize: 13 }}>{opt.label}</Text>
                              <div>
                                <Text type="secondary" style={{ fontSize: 11 }}>
                                  {opt.description}
                                </Text>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div style={{ flex: "1 1 260px", minWidth: 220 }}>
                      <Text strong style={{ display: "block", marginBottom: 4 }}>
                        Field & feature rules
                      </Text>
                      <Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 8 }}>
                        Inherited from {level?.name ?? "their level"} - manage via By role
                      </Text>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <Text style={{ fontSize: 13 }}>Bulk re-assign records</Text>
                          <Switch checked={employeeBulkReassignGranted} disabled />
                        </div>
                        {(
                          [
                            { key: "seeCreditFields", label: "See customer credit and exposure" },
                            { key: "seeMarginFields", label: "See margin and cost fields" },
                            { key: "canExport", label: "Export to Excel / CSV" },
                            { key: "canViewCallRecordings", label: "View call recordings" },
                            { key: "canSeeUnmaskedPii", label: "See personal data unmasked" },
                          ] as const
                        ).map((f) => (
                          <div key={f.key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <Text style={{ fontSize: 13 }}>{f.label}</Text>
                            <Switch checked={level ? level[f.key] : false} disabled />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })()}

              <Text strong style={{ display: "block", marginTop: 16, marginBottom: 4 }}>
                Override history
              </Text>
              <Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 8 }}>
                Every grant or revoke beyond the role, with who made it
              </Text>
              {overrides.length === 0 ? (
                <Text type="secondary" style={{ fontSize: 12 }}>
                  No overrides for this person
                </Text>
              ) : (
                overrides.map((o) => (
                  <div key={o.id} style={{ display: "flex", gap: 10, padding: "8px 0", borderTop: `1px solid ${appTokens.borderLight}` }}>
                    <div
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: "50%",
                        flexShrink: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: o.grantType === "grant" ? "#f0e6fa" : "#fde3e2",
                        color: o.grantType === "grant" ? appTokens.purple : appTokens.danger,
                      }}
                    >
                      {o.grantType === "grant" ? <PlusOutlined style={{ fontSize: 11 }} /> : <CloseOutlined style={{ fontSize: 11 }} />}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                        <Text style={{ fontSize: 13 }}>
                          {o.permission} {o.grantType === "grant" ? "granted" : "revoked"}
                          {o.clearedAt ? " · cleared" : ""}
                        </Text>
                        <Text type="secondary" style={{ fontSize: 11, whiteSpace: "nowrap" }}>
                          {new Date(o.createdAt).toLocaleDateString(undefined, { day: "2-digit", month: "short" })}
                        </Text>
                      </div>
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        {o.createdByName ?? "Unknown"}
                        {o.reason ? ` · ${o.reason}` : ""}
                        {o.expiresAt ? ` · expires ${new Date(o.expiresAt).toLocaleDateString()}` : ""}
                      </Text>
                    </div>
                  </div>
                ))
              )}
            </>
          )}
        </div>
      </div>

      <Modal
        title={
          action?.kind === "clear"
            ? "Clear override"
            : action?.kind === "grant"
              ? "Grant extra access"
              : "Revoke access for this person"
        }
        open={!!action}
        onCancel={() => setAction(null)}
        onOk={submitAction}
        okText={action?.kind === "clear" ? "Clear" : "Save"}
      >
        {action && (
          <>
            <Text>
              {action.label} ({action.permissions.length} permission{action.permissions.length === 1 ? "" : "s"}) for {selectedUser?.name}
            </Text>
            {action.kind !== "clear" && (
              <Input.TextArea
                style={{ marginTop: 12 }}
                placeholder="Reason (optional)"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
              />
            )}
          </>
        )}
      </Modal>
    </Card>
  );
}
