import { useEffect, useState } from "react";
import { Button, Card, Space, Switch, Typography, message } from "antd";
import { HolderOutlined, PlusOutlined } from "@ant-design/icons";
import * as levelApi from "../api/level-api";
import * as structureAxisApi from "../api/structure-axis-api";
import type { Level } from "../types/level";
import type { StructureAxis } from "../types/structure-axis";
import { useHasPermission } from "../hooks/use-permission";
import { formatCompactCurrency } from "../utils/lead-format";
import { appTokens } from "../utils/design-system";
import { LevelDrawer } from "./LevelDrawer";

const { Text } = Typography;

function headcountLabel(level: Level): string {
  if (level.headcountLimit === null) return "unlimited";
  const open = level.headcountLimit - level.currentHeadcount;
  return open > 0 ? `${open} open` : "full";
}

interface LevelsCardProps {
  onChange?: (levels: Level[]) => void;
}

// Upgrades the Phase 1A "just a name" list into the full Levels & axes
// screen: approval ceilings/headcount limits are configuration only (no
// approval workflow reads them yet - that's a later phase), and drag
// reorder persists sort_order via the same per-level PATCH the drawer uses.
export function LevelsCard({ onChange }: LevelsCardProps) {
  const hasPermission = useHasPermission();
  const [levels, setLevels] = useState<Level[]>([]);
  const [axes, setAxes] = useState<StructureAxis[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingLevel, setEditingLevel] = useState<Level | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const loadLevels = () => {
    setLoading(true);
    levelApi
      .listLevels()
      .then((rows) => {
        setLevels(rows);
        onChange?.(rows);
      })
      .catch(() => message.error("Failed to load levels"))
      .finally(() => setLoading(false));
  };

  const loadAxes = () => {
    structureAxisApi.listStructureAxes().then(setAxes).catch(() => undefined);
  };

  useEffect(loadLevels, []);
  useEffect(loadAxes, []);

  const openCreate = () => {
    setEditingLevel(null);
    setDrawerOpen(true);
  };

  const openEdit = (level: Level) => {
    setEditingLevel(level);
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setEditingLevel(null);
  };

  const handleSaved = () => {
    closeDrawer();
    loadLevels();
  };

  const canReorder = hasPermission("levels.create");

  const handleDrop = async (targetIndex: number) => {
    if (dragIndex === null || dragIndex === targetIndex) {
      setDragIndex(null);
      return;
    }
    const reordered = [...levels];
    const [moved] = reordered.splice(dragIndex, 1);
    reordered.splice(targetIndex, 0, moved);
    setDragIndex(null);
    setLevels(reordered);

    try {
      await Promise.all(
        reordered.map((lvl, idx) => (lvl.sortOrder !== idx ? levelApi.updateLevel(lvl.id, { sortOrder: idx }) : null))
      );
      loadLevels();
    } catch {
      message.error("Failed to reorder levels");
      loadLevels();
    }
  };

  const toggleAxis = async (axis: StructureAxis) => {
    try {
      await structureAxisApi.setAxisEnabled(axis.id, !axis.isEnabled);
      loadAxes();
    } catch {
      message.error("Failed to update structure axis");
    }
  };

  return (
    <Card size="small" style={{ marginBottom: 16 }} loading={loading}>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        <div style={{ flex: "2 1 320px", minWidth: 280 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div>
              <Text strong>Designation ladder</Text>
              <div>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Drag to reorder. Level number drives escalation and visibility.
                </Text>
              </div>
            </div>
            {hasPermission("levels.create") && (
              <Button size="small" type="primary" icon={<PlusOutlined />} onClick={openCreate}>
                Add level
              </Button>
            )}
          </div>

          {levels.length === 0 ? (
            <Text type="secondary">No levels yet - add one above</Text>
          ) : (
            levels.map((level, idx) => (
              <div
                key={level.id}
                draggable={canReorder}
                onDragStart={() => setDragIndex(idx)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDrop(idx)}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 10px",
                  border: `1px solid ${appTokens.border}`,
                  borderRadius: appTokens.radiusSm,
                  marginBottom: 6,
                  cursor: canReorder ? "grab" : "default",
                  background: appTokens.surface,
                }}
              >
                <div style={{ display: "flex", gap: 8, alignItems: "flex-start", minWidth: 0 }}>
                  {canReorder && <HolderOutlined style={{ marginTop: 4, color: appTokens.textTertiary }} />}
                  <div style={{ minWidth: 0 }}>
                    <Text strong>
                      L{idx + 1} · {level.name}
                    </Text>
                    <div>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {level.description || "No description"}
                      </Text>
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: "right", fontSize: 12, flexShrink: 0 }}>
                  <div>
                    {level.currentHeadcount} {level.currentHeadcount === 1 ? "person" : "people"} · {headcountLabel(level)}
                  </div>
                  <Text type="secondary">
                    {level.approvalCeiling !== null ? `up to ${formatCompactCurrency(level.approvalCeiling)}` : "no ceiling set"}
                  </Text>
                </div>
                {hasPermission("levels.create") && (
                  <Button type="link" size="small" onClick={() => openEdit(level)}>
                    Edit
                  </Button>
                )}
              </div>
            ))
          )}
        </div>

        <div style={{ flex: "1 1 240px", minWidth: 220 }}>
          <Text strong>Structure axes</Text>
          <div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              The hierarchy branches on every axis you switch on
            </Text>
          </div>
          <Space direction="vertical" style={{ width: "100%", marginTop: 8 }}>
            {axes.map((axis) => (
              <div
                key={axis.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "6px 10px",
                  border: `1px solid ${appTokens.border}`,
                  borderRadius: appTokens.radiusSm,
                  background: appTokens.surface,
                }}
              >
                <div>
                  <Text>{axis.label}</Text>
                  {axis.description && (
                    <div>
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        {axis.description}
                      </Text>
                    </div>
                  )}
                </div>
                <Switch
                  size="small"
                  checked={axis.isEnabled}
                  disabled={!hasPermission("levels.create")}
                  onChange={() => toggleAxis(axis)}
                />
              </div>
            ))}
          </Space>
        </div>
      </div>

      <LevelDrawer open={drawerOpen} level={editingLevel} nextSortOrder={levels.length} onClose={closeDrawer} onSaved={handleSaved} />
    </Card>
  );
}
