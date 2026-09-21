import { useEffect, useMemo, useState } from "react";
import { Button, Card, Table, Tag, Typography, message } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import * as levelApi from "../api/level-api";
import * as rolePermissionApi from "../api/role-permission-api";
import type { RolePermissionMatrix } from "../types/role-permission";
import type { TeamMember } from "../types/user";
import type { Level } from "../types/level";
import { useHasPermission } from "../hooks/use-permission";
import { MODULE_LABELS, modulesOf } from "../utils/permission-format";
import { approvesUpToLabel, headcountLabel, peersLabel, seesLabel } from "../utils/level-format";
import { LevelDrawer } from "./LevelDrawer";

const { Text } = Typography;

interface RolesAccessCardProps {
  users: TeamMember[];
  levels: Level[];
  onLevelsChange?: (levels: Level[]) => void;
}

// "Role" here is the same Levels table the Levels & axes tab edits - the
// user's explicit decision after seeing the reference was to keep the real
// 3-tier security model (admin/manager/agent, unchanged everywhere in the
// backend) and layer these richer labels on top, rather than build a fully
// dynamic custom-role system. SEES/PEERS/APPROVES UP TO are derived from
// each level's real data (record_scope, approval_ceiling, headcount) - nothing
// here is a second, disconnected copy of what Levels & axes already holds.
export function RolesAccessCard({ users, levels, onLevelsChange }: RolesAccessCardProps) {
  const hasPermission = useHasPermission();
  const canManageLevels = hasPermission("levels.create");
  const [matrix, setMatrix] = useState<RolePermissionMatrix | null>(null);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    rolePermissionApi
      .getRolePermissionMatrix()
      .then(setMatrix)
      .catch(() => message.error("Failed to load roles & access"))
      .finally(() => setLoading(false));
  }, []);

  const modules = useMemo(() => (matrix ? modulesOf(matrix.catalog) : []), [matrix]);
  const topLadderSortOrder = useMemo(() => {
    const ladder = levels.filter((l) => !l.isCrossCutting).map((l) => l.sortOrder);
    return ladder.length === 0 ? null : Math.min(...ladder);
  }, [levels]);

  const rows = useMemo(
    () =>
      levels.map((level) => ({
        level,
        userCount: users.filter((u) => u.levelId === level.id).length,
      })),
    [levels, users]
  );

  const visibilityFor = (level: Level, mod: string): "View + manage" | "View only" | "Hidden" => {
    const grants = matrix?.grants[level.securityTier] ?? [];
    if (!grants.includes(`${mod}.view`)) return "Hidden";
    if (grants.includes(`${mod}.update`) || grants.includes(`${mod}.delete`) || grants.includes(`${mod}.create`)) return "View + manage";
    return "View only";
  };

  const closeDrawer = () => setDrawerOpen(false);
  const handleSaved = () => {
    closeDrawer();
    levelApi.listLevels().then((rows) => onLevelsChange?.(rows));
  };

  return (
    <Card size="small" style={{ marginBottom: 16 }} loading={loading}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
        <div>
          <Text strong>Roles & access</Text>
          <div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Data ownership - own records plus everyone below in the reporting tree, unless a level says otherwise
            </Text>
          </div>
        </div>
        {canManageLevels && (
          <Button size="small" icon={<PlusOutlined />} onClick={() => setDrawerOpen(true)}>
            New role
          </Button>
        )}
      </div>

      <Table
        size="small"
        style={{ marginTop: 8 }}
        rowKey={(row) => row.level.id}
        dataSource={rows}
        pagination={false}
        columns={[
          { title: "Role", key: "role", render: (_, row) => row.level.name },
          { title: "Sees", key: "sees", render: (_, row) => seesLabel(row.level, row.level.sortOrder === topLadderSortOrder) },
          {
            title: "Peers",
            key: "peers",
            render: (_, row) => <Tag>{peersLabel(row.level)}</Tag>,
          },
          { title: "Can edit", key: "canEdit", render: (_, row) => row.level.canEditLabel ?? "-" },
          { title: "Approves up to", key: "approvesUpTo", render: (_, row) => approvesUpToLabel(row.level) },
          { title: "Users / open", key: "users", render: (_, row) => headcountLabel(row.level) },
        ]}
      />

      <Text strong style={{ display: "block", marginTop: 16, marginBottom: 4 }}>
        Record visibility matrix
      </Text>
      <Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 8 }}>
        What each role can reach, derived from the real permission catalog - levels sharing a security tier share the
        same real access, even where their Sees/Peers labels above differ
      </Text>
      <Table
        size="small"
        rowKey={(row) => row.level.id}
        pagination={false}
        dataSource={rows}
        columns={[
          { title: "Role", key: "role", render: (_, row) => row.level.name },
          ...modules.map((mod) => ({
            title: MODULE_LABELS[mod] ?? mod,
            key: mod,
            render: (_: unknown, row: (typeof rows)[number]) => {
              const state = visibilityFor(row.level, mod);
              const color = state === "Hidden" ? "default" : state === "View only" ? "gold" : "green";
              return <Tag color={color}>{state}</Tag>;
            },
          })),
        ]}
        scroll={{ x: "max-content" }}
      />

      <LevelDrawer open={drawerOpen} level={null} nextSortOrder={levels.length} onClose={closeDrawer} onSaved={handleSaved} />
    </Card>
  );
}
