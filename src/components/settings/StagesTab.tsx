import { useEffect, useState } from "react";
import { Button, Tag, Typography, message } from "antd";
import { HolderOutlined } from "@ant-design/icons";
import * as pipelineStageApi from "../../api/pipeline-stage-api";
import type { PipelineStage } from "../../types/pipeline-stage";
import { appTokens } from "../../utils/design-system";
import { EditStageModal } from "./EditStageModal";

const { Text } = Typography;

export function StagesTab() {
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<PipelineStage | null>(null);
  const [creating, setCreating] = useState(false);
  const [draggingKey, setDraggingKey] = useState<string | null>(null);
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    pipelineStageApi
      .listPipelineStages()
      .then(setStages)
      .catch(() => message.error("Failed to load stages"))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  // Same native HTML5 drag-and-drop already used for the Opportunities
  // Kanban board - no new dependency, same technique this app already has.
  const handleDrop = async (targetKey: string) => {
    if (!draggingKey || draggingKey === targetKey) {
      setDraggingKey(null);
      setDragOverKey(null);
      return;
    }
    const reordered = [...stages];
    const fromIndex = reordered.findIndex((s) => s.key === draggingKey);
    const toIndex = reordered.findIndex((s) => s.key === targetKey);
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);
    setStages(reordered);
    setDraggingKey(null);
    setDragOverKey(null);
    try {
      await pipelineStageApi.reorderPipelineStages(reordered.map((s) => s.key));
    } catch {
      message.error("Failed to save the new order");
      load();
    }
  };

  return (
    <div
      style={{
        border: `1px solid ${appTokens.border}`,
        borderRadius: appTokens.radius,
        background: appTokens.surface,
        boxShadow: appTokens.shadowSm,
      }}
    >
      <div style={{ padding: "14px 18px", borderBottom: `1px solid ${appTokens.borderLight}` }}>
        <Text strong style={{ fontSize: 14 }}>
          Lead stages
        </Text>
        <div>
          <Text style={{ fontSize: 12.5, color: appTokens.textTertiary }}>
            Drag to reorder. Descriptions show as guidance inside the stage column. Opportunities keep their own separate deal-stage pipeline (the Kanban board), not this list.
          </Text>
        </div>
      </div>

      {!loading &&
        stages.map((stage, idx) => {
          const isDragOver = dragOverKey === stage.key && draggingKey !== stage.key;
          return (
            <div
              key={stage.key}
              draggable
              onDragStart={() => setDraggingKey(stage.key)}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverKey(stage.key);
              }}
              onDragLeave={() => setDragOverKey((prev) => (prev === stage.key ? null : prev))}
              onDrop={(e) => {
                e.preventDefault();
                handleDrop(stage.key);
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 18,
                padding: "14px 28px 14px 18px",
                borderBottom: idx === stages.length - 1 ? "none" : `1px solid ${appTokens.borderLight}`,
                background: isDragOver ? appTokens.primarySoft : appTokens.surface,
                opacity: draggingKey === stage.key ? 0.4 : 1,
                cursor: "grab",
              }}
            >
              <HolderOutlined style={{ color: appTokens.textTertiary, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <Text strong style={{ fontSize: 13.5 }}>
                  {stage.label}
                </Text>
                <div>
                  <Text style={{ fontSize: 12, color: appTokens.textTertiary }}>{stage.description ?? "—"}</Text>
                </div>
              </div>
              <Text style={{ fontSize: 13, color: appTokens.textSecondary, width: 130, flexShrink: 0 }}>Probability {stage.probability}%</Text>
              <Tag
                style={{
                  margin: 0,
                  width: 68,
                  textAlign: "center",
                  fontWeight: 600,
                  border: "none",
                  color: stage.isActive ? appTokens.success : appTokens.textTertiary,
                  background: stage.isActive ? `${appTokens.success}17` : appTokens.surfaceMuted,
                  flexShrink: 0,
                }}
              >
                {stage.isActive ? "Active" : "Inactive"}
              </Tag>
              <Button size="small" type="link" onClick={() => setEditing(stage)}>
                Edit
              </Button>
            </div>
          );
        })}

      <div style={{ padding: "14px 18px" }}>
        <Button onClick={() => setCreating(true)}>+ Add stage</Button>
      </div>

      <EditStageModal
        open={editing !== null || creating}
        onClose={() => {
          setEditing(null);
          setCreating(false);
        }}
        stage={editing}
        onSaved={() => {
          setEditing(null);
          setCreating(false);
          load();
        }}
      />
    </div>
  );
}
