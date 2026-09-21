import { useEffect, useMemo, useState } from "react";
import { Button, Card, Input, Modal, Popconfirm, Segmented, Space, Tag, Typography, message } from "antd";
import * as rolePermissionApi from "../api/role-permission-api";
import * as overrideApi from "../api/user-permission-override-api";
import type { RolePermissionMatrix } from "../types/role-permission";
import type { UserPermissionOverride } from "../types/user-permission-override";
import type { TeamMember } from "../types/user";
import type { Role } from "../types/auth";
import { useHasPermission } from "../hooks/use-permission";
import { MODULE_LABELS, groupByModule, verbOf } from "../utils/permission-format";

const { Text } = Typography;

const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: "admin", label: "Administrator" },
  { value: "manager", label: "Manager" },
  { value: "agent", label: "Agent" },
];

// Exactly which individual permissions requirePermission actually consults
// today - leads/opportunities/activities from Phase 3C, plus role_permissions
// .view, user_permission_overrides.view, manager_change_log.view and every
// approval_bands verb from the post-Phase-3 retrofit (role_permissions
// .update and user_permission_overrides.create/.delete deliberately stay on
// requireRole(ADMIN_ONLY) - see role-permission-routes.ts - so they're left
// out here on purpose). Everything else still checks requireRole directly,
// so toggling those here only changes what this screen displays, not what
// the backend enforces - flagged in the UI rather than left for someone to
// assume.
const ENFORCED_PERMISSIONS = new Set([
  "leads.view", "leads.create", "leads.update", "leads.delete", "leads.share",
  "opportunities.view", "opportunities.create", "opportunities.update", "opportunities.delete",
  "activities.view", "activities.create", "activities.update", "activities.delete",
  "role_permissions.view",
  "user_permission_overrides.view",
  "manager_change_log.view",
  "approval_bands.view", "approval_bands.create", "approval_bands.update", "approval_bands.delete",
]);

type EnforcementState = "full" | "partial" | "none";

function enforcementStateOf(perms: string[]): EnforcementState {
  const enforcedCount = perms.filter((p) => ENFORCED_PERMISSIONS.has(p)).length;
  if (enforcedCount === 0) return "none";
  if (enforcedCount === perms.length) return "full";
  return "partial";
}

interface PermissionsCardProps {
  users: TeamMember[];
}

type OverrideAction = { permission: string; kind: "grant" | "revoke" | "clear"; overrideId?: string };

export function PermissionsCard({ users }: PermissionsCardProps) {
  const hasPermission = useHasPermission();
  // Role-baseline toggling and per-employee overrides mutate authorization
  // data itself, so each stays gated by its own admin-only permission rather
  // than reusing users.update as a stand-in - see model.ts's retrofit note.
  const canManageRoles = hasPermission("role_permissions.update");
  const canManageOverrides = hasPermission("user_permission_overrides.create");

  const [mode, setMode] = useState<"role" | "employee">("role");
  const [matrix, setMatrix] = useState<RolePermissionMatrix | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState<Role>("admin");
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
  const activeOverrides = overrides.filter((o) => !o.clearedAt);
  const overrideFor = (permission: string) => activeOverrides.find((o) => o.permission === permission);

  const toggleRolePermission = async (permission: string, currentlyGranted: boolean) => {
    try {
      const updated = await rolePermissionApi.setRolePermission(selectedRole, permission, !currentlyGranted);
      setMatrix(updated);
      message.success(`${permission} ${!currentlyGranted ? "granted to" : "revoked from"} ${selectedRole}`);
    } catch {
      message.error("Failed to update role permission");
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

  const clearAllForSelected = async () => {
    if (!selectedUserId) return;
    try {
      const count = await overrideApi.clearAllOverridesForUser(selectedUserId);
      message.success(`Cleared ${count} override${count === 1 ? "" : "s"}`);
      loadOverrides(selectedUserId);
    } catch {
      message.error("Failed to clear overrides");
    }
  };

  const grantsForRole = matrix?.grants[selectedRole] ?? [];
  const catalogGroups = matrix ? groupByModule(matrix.catalog) : [];

  return (
    <Card size="small" style={{ marginBottom: 16 }} loading={loading}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, flexWrap: "wrap", gap: 8 }}>
        <Text strong>Permissions</Text>
        <Segmented
          size="small"
          value={mode}
          onChange={(v) => setMode(v as "role" | "employee")}
          options={[
            { value: "role", label: "By role" },
            { value: "employee", label: "By employee" },
          ]}
        />
      </div>

      {mode === "role" ? (
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <div style={{ flex: "0 0 160px" }}>
            {ROLE_OPTIONS.map((r) => (
              <div
                key={r.value}
                onClick={() => setSelectedRole(r.value)}
                style={{
                  padding: "6px 10px",
                  borderRadius: 6,
                  cursor: "pointer",
                  marginBottom: 4,
                  background: selectedRole === r.value ? "#e6f4ff" : "transparent",
                  fontWeight: selectedRole === r.value ? 600 : 400,
                }}
              >
                {r.label}
              </div>
            ))}
          </div>
          <div style={{ flex: "1 1 400px", minWidth: 280 }}>
            <Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 8 }}>
              Baseline for everyone holding this role. Live-enforced modules take effect immediately; reference-only
              ones are still gated by fixed role checks in the backend.
            </Text>
            {catalogGroups.map(([mod, perms]) => {
              const state = enforcementStateOf(perms);
              return (
                <div key={mod} style={{ marginBottom: 10 }}>
                  <Space size={6} style={{ marginBottom: 4 }}>
                    <Text strong style={{ fontSize: 13 }}>
                      {MODULE_LABELS[mod] ?? mod}
                    </Text>
                    {state === "full" && (
                      <Tag color="green" style={{ fontSize: 10 }}>
                        Live-enforced
                      </Tag>
                    )}
                    {state === "partial" && (
                      <Tag color="gold" style={{ fontSize: 10 }}>
                        Partially enforced
                      </Tag>
                    )}
                    {state === "none" && <Tag style={{ fontSize: 10 }}>Reference only</Tag>}
                  </Space>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {perms.map((perm) => {
                      const granted = grantsForRole.includes(perm);
                      const tag = (
                        <Tag
                          key={perm}
                          color={granted ? "green" : "default"}
                          style={{ cursor: canManageRoles ? "pointer" : "default" }}
                          title={ENFORCED_PERMISSIONS.has(perm) ? "Live-enforced" : "Reference only"}
                        >
                          {verbOf(perm)}
                        </Tag>
                      );
                      if (!canManageRoles) return tag;
                      return (
                        <Popconfirm
                          key={perm}
                          title={`${granted ? "Revoke" : "Grant"} ${perm} ${granted ? "from" : "to"} ${selectedRole}?`}
                          description={
                            ENFORCED_PERMISSIONS.has(perm)
                              ? "This takes effect immediately."
                              : "This module still checks a fixed role, not this table - this only changes what this screen displays."
                          }
                          onConfirm={() => toggleRolePermission(perm, granted)}
                          okText={granted ? "Revoke" : "Grant"}
                        >
                          {tag}
                        </Popconfirm>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            <Text type="secondary" style={{ fontSize: 12, display: "block", marginTop: 12 }}>
              Record scope: not configurable per role today. Every role uses the same manager-subtree + explicit-share
              rules in the backend - this screen does not change who can see which individual record.
            </Text>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <div style={{ flex: "0 0 220px" }}>
            <Input.Search placeholder="Search people" value={search} onChange={(e) => setSearch(e.target.value)} allowClear style={{ marginBottom: 8 }} />
            <div style={{ maxHeight: 320, overflowY: "auto" }}>
              {filteredUsers.map((u) => (
                <div
                  key={u.id}
                  onClick={() => setSelectedUserId(u.id)}
                  style={{
                    padding: "6px 10px",
                    borderRadius: 6,
                    cursor: "pointer",
                    marginBottom: 2,
                    background: selectedUserId === u.id ? "#e6f4ff" : "transparent",
                  }}
                >
                  <Text strong style={{ fontSize: 13, display: "block" }}>
                    {u.name}
                  </Text>
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    {u.role}
                  </Text>
                </div>
              ))}
            </div>
          </div>
          <div style={{ flex: "1 1 400px", minWidth: 280 }}>
            {!selectedUser ? (
              <Text type="secondary">Select a person to see their effective permissions</Text>
            ) : !canManageOverrides ? (
              <Text type="secondary">Only an administrator can view or change per-employee overrides.</Text>
            ) : (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <div>
                    <Text strong>{selectedUser.name}</Text>
                    <div>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        Role: {selectedUser.role} · Overrides sit on top of the role baseline (not yet enforced by the
                        backend - foundation only)
                      </Text>
                    </div>
                  </div>
                  {activeOverrides.length > 0 && (
                    <Popconfirm title="Clear every active override for this person?" onConfirm={clearAllForSelected}>
                      <Button size="small">Clear overrides</Button>
                    </Popconfirm>
                  )}
                </div>

                {catalogGroups.map(([mod, perms]) => (
                  <div key={mod} style={{ marginBottom: 10 }}>
                    <Text strong style={{ fontSize: 13 }}>
                      {MODULE_LABELS[mod] ?? mod}
                    </Text>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
                      {perms.map((perm) => {
                        const roleGranted = matrix?.grants[selectedUser.role]?.includes(perm) ?? false;
                        const override = overrideFor(perm);
                        let color = "default";
                        let label = "Not allowed";
                        if (override?.grantType === "grant") {
                          color = "purple";
                          label = "Extra grant";
                        } else if (override?.grantType === "revoke") {
                          color = "red";
                          label = "Revoked";
                        } else if (roleGranted) {
                          color = "green";
                          label = "From role";
                        }
                        return (
                          <Tag
                            key={perm}
                            color={color}
                            style={{ cursor: "pointer" }}
                            onClick={() => openAction(perm, roleGranted)}
                            title={`${verbOf(perm)} - ${label}`}
                          >
                            {verbOf(perm)}
                          </Tag>
                        );
                      })}
                    </div>
                  </div>
                ))}

                <div style={{ marginTop: 12 }}>
                  <Text strong style={{ fontSize: 13 }}>
                    Override history
                  </Text>
                  {overrides.length === 0 ? (
                    <div>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        No overrides for this person
                      </Text>
                    </div>
                  ) : (
                    overrides.map((o) => (
                      <div key={o.id} style={{ fontSize: 12, padding: "4px 0", borderBottom: "1px solid #f0f0f0" }}>
                        <Text>
                          {o.permission} {o.grantType === "grant" ? "granted" : "revoked"}
                          {o.clearedAt ? " · cleared" : ""}
                        </Text>
                        <div>
                          <Text type="secondary">
                            {o.createdByName ?? "Unknown"} · {new Date(o.createdAt).toLocaleDateString()}
                            {o.reason ? ` · ${o.reason}` : ""}
                            {o.expiresAt ? ` · expires ${new Date(o.expiresAt).toLocaleDateString()}` : ""}
                          </Text>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

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
