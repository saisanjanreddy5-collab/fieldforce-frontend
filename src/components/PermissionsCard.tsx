import { useEffect, useMemo, useState } from "react";
import { Card, Input, Modal, Popconfirm, Segmented, Switch, Table, Tag, Typography, message } from "antd";
import { CheckOutlined, CloseOutlined, MinusOutlined, PlusOutlined } from "@ant-design/icons";
import * as rolePermissionApi from "../api/role-permission-api";
import * as overrideApi from "../api/user-permission-override-api";
import * as levelApi from "../api/level-api";
import type { RolePermissionMatrix } from "../types/role-permission";
import type { UserPermissionOverride } from "../types/user-permission-override";
import type { TeamMember } from "../types/user";
import type { Level } from "../types/level";
import { useHasPermission } from "../hooks/use-permission";
import { MODULE_LABELS, modulesOf, verbOf } from "../utils/permission-format";
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

const VERB_ORDER = ["view", "create", "update", "delete", "share", "view_own", "view_team"];
const VERB_LABELS: Record<string, string> = {
  view: "View",
  create: "Create",
  update: "Edit",
  delete: "Delete",
  share: "Share",
  view_own: "View own",
  view_team: "View team",
};

function allVerbsIn(catalog: string[]): string[] {
  const found = new Set(catalog.map(verbOf));
  return VERB_ORDER.filter((v) => found.has(v));
}

function moduleVerbSets(catalog: string[]): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();
  for (const perm of catalog) {
    const mod = perm.split(".")[0];
    const verb = verbOf(perm);
    if (!map.has(mod)) map.set(mod, new Set());
    map.get(mod)!.add(verb);
  }
  return map;
}

interface PermissionsCardProps {
  users: TeamMember[];
  levels: Level[];
  onLevelsChange?: (levels: Level[]) => void;
}

type OverrideAction = { permission: string; kind: "grant" | "revoke" | "clear"; overrideId?: string };

type CellState = "na" | "granted" | "not-granted" | "extra-grant" | "revoked";

function Cell({ state, onClick }: { state: CellState; onClick?: () => void }) {
  if (state === "na") return <MinusOutlined style={{ color: "#d9d9d9" }} />;
  const icon =
    state === "granted" || state === "extra-grant" ? (
      <CheckOutlined style={{ color: state === "extra-grant" ? appTokens.purple : appTokens.success }} />
    ) : state === "revoked" ? (
      <CloseOutlined style={{ color: appTokens.danger }} />
    ) : (
      <MinusOutlined style={{ color: "#bfbfbf" }} />
    );
  if (!onClick) return icon;
  return (
    <span style={{ cursor: "pointer", display: "inline-block", padding: "0 6px" }} onClick={onClick}>
      {icon}
    </span>
  );
}

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

  const modules = useMemo(() => (matrix ? modulesOf(matrix.catalog) : []), [matrix]);
  const verbs = useMemo(() => (matrix ? allVerbsIn(matrix.catalog) : []), [matrix]);
  const verbSetsByModule = useMemo(() => (matrix ? moduleVerbSets(matrix.catalog) : new Map()), [matrix]);

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

  const updateLevelField = async (field: keyof Level, value: unknown) => {
    if (!selectedLevel) return;
    try {
      const updated = await levelApi.updateLevel(selectedLevel.id, { [field]: value });
      onLevelsChange?.(levels.map((l) => (l.id === updated.id ? updated : l)));
    } catch {
      message.error("Failed to update level");
    }
  };

  const openAction = (permission: string, roleGranted: boolean) => {
    const existing = overrideFor(permission);
    setReason("");
    if (existing) {
      setAction({ permission, kind: "clear", overrideId: existing.id });
    } else {
      setAction({ permission, kind: roleGranted ? "revoke" : "grant" });
    }
  };

  const submitAction = async () => {
    if (!action || !selectedUserId) return;
    try {
      if (action.kind === "clear" && action.overrideId) {
        await overrideApi.clearOverride(action.overrideId);
        message.success("Override cleared");
      } else {
        await overrideApi.createOverride({
          userId: selectedUserId,
          permission: action.permission,
          grantType: action.kind === "grant" ? "grant" : "revoke",
          reason: reason || undefined,
        });
        message.success(action.kind === "grant" ? "Extra access granted" : "Access revoked for this person");
      }
      setAction(null);
      loadOverrides(selectedUserId);
    } catch {
      message.error("Failed to update override");
    }
  };

  const roleCellState = (mod: string, verb: string): CellState => {
    if (!verbSetsByModule.get(mod)?.has(verb)) return "na";
    return grantsForSelectedTier.includes(`${mod}.${verb}`) ? "granted" : "not-granted";
  };

  const employeeCellState = (mod: string, verb: string): CellState => {
    if (!verbSetsByModule.get(mod)?.has(verb)) return "na";
    const permission = `${mod}.${verb}`;
    const roleGranted = selectedUser ? matrix?.grants[selectedUser.role]?.includes(permission) ?? false : false;
    const override = overrideFor(permission);
    if (override?.grantType === "grant") return "extra-grant";
    if (override?.grantType === "revoke") return "revoked";
    return roleGranted ? "granted" : "not-granted";
  };

  const bulkReassignGranted = grantsForSelectedTier.includes("leads.update");
  const employeeBulkReassignState = employeeCellState("leads", "update");
  const employeeBulkReassignGranted = employeeBulkReassignState === "granted" || employeeBulkReassignState === "extra-grant";

  const tableColumns = [
    { title: "Module", key: "module", render: (_: unknown, mod: string) => <Text strong>{MODULE_LABELS[mod] ?? mod}</Text> },
    ...verbs.map((verb) => ({
      title: VERB_LABELS[verb] ?? verb,
      key: verb,
      align: "center" as const,
      render: (_: unknown, mod: string) => {
        const state = mode === "role" ? roleCellState(mod, verb) : employeeCellState(mod, verb);
        const enforced = ENFORCED_PERMISSIONS.has(`${mod}.${verb}`);
        if (mode === "role") {
          if (state === "na" || !canManageRoles) return <Cell state={state} />;
          return (
            <Popconfirm
              title={`${state === "granted" ? "Revoke" : "Grant"} ${mod}.${verb} ${state === "granted" ? "from" : "to"} the ${selectedLevel?.securityTier} tier?`}
              description={enforced ? "This takes effect immediately." : "This module still checks a fixed role, not this table - this only changes what this screen displays."}
              onConfirm={() => toggleRolePermission(`${mod}.${verb}`, state === "granted")}
            >
              <Cell state={state} />
            </Popconfirm>
          );
        }
        if (state === "na" || !canManageOverrides) return <Cell state={state} />;
        return <Cell state={state} onClick={() => openAction(`${mod}.${verb}`, state === "granted")} />;
      },
    })),
  ];

  return (
    <Card size="small" style={{ marginBottom: 16, boxShadow: appTokens.shadowXs }} loading={loading}>
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
                    L{ladderIndex(l, levels)} · {l.securityTier}
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
                      padding: "6px 10px",
                      borderRadius: 6,
                      cursor: "pointer",
                      marginBottom: 2,
                      background: selectedUserId === u.id ? appTokens.primarySoft : "transparent",
                    }}
                  >
                    <Text strong style={{ fontSize: 13, display: "block" }}>
                      {u.name}
                    </Text>
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      {levels.find((l) => l.id === u.levelId)?.name ?? u.role}
                    </Text>
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
                  rowKey={(mod) => mod as string}
                  dataSource={modules}
                  pagination={false}
                  columns={tableColumns}
                  scroll={{ x: "max-content" }}
                />

                <Text strong style={{ display: "block", marginTop: 16, marginBottom: 4 }}>
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

                <Text strong style={{ display: "block", marginTop: 16, marginBottom: 4 }}>
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
              </>
            )
          ) : !selectedUser ? (
            <Text type="secondary">Select a person to see their effective permissions</Text>
          ) : !canManageOverrides ? (
            <Text type="secondary">Only an administrator can view or change per-employee overrides.</Text>
          ) : (
            <>
              <div style={{ marginBottom: 8 }}>
                <Text strong>{selectedUser.name}</Text>
                <div>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {selectedUser.designation ?? selectedUser.role}
                    {" · "}
                    {levels.find((l) => l.id === selectedUser.levelId)?.name ?? "No level assigned"}
                  </Text>
                </div>
              </div>

              <Table
                size="small"
                rowKey={(mod) => mod as string}
                dataSource={modules}
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
                  <div key={o.id} style={{ display: "flex", gap: 10, padding: "8px 0", borderTop: "1px solid #f0f0f0" }}>
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
              {action.permission} for {selectedUser?.name}
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
