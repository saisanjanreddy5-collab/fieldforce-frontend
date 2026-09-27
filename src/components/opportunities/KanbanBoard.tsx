import { useState } from "react";
import { Button, Skeleton, Typography } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import type { Opportunity } from "../../types/opportunity";
import { formatCompactCurrency } from "../../utils/lead-format";
import { useHasPermission } from "../../hooks/use-permission";
import { appTokens } from "../../utils/design-system";
import { OpportunityCard } from "./OpportunityCard";
import { STAGES } from "./stages";

const { Text } = Typography;

interface KanbanBoardProps {
  opportunities: Opportunity[];
  loading: boolean;
  onCardClick: (opportunity: Opportunity) => void;
  onAddToStage: (stageKey: string) => void;
  onMoveStage: (opportunityId: string, stageKey: string) => void;
}

// Won/Lost are terminal outcomes, not "in-progress" stages like the rest of
// the pipeline - a tinted column background instead of the same neutral
// gray as every other stage makes that distinction visible without reading
// the label.
const TERMINAL_TINT: Record<string, string> = {
  won: "#f3fbf6",
  lost: "#fdf4f4",
};

export function KanbanBoard({ opportunities, loading, onCardClick, onAddToStage, onMoveStage }: KanbanBoardProps) {
  const hasPermission = useHasPermission();
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const columns = STAGES.map((stage) => ({ ...stage, items: opportunities.filter((o) => o.stage === stage.key) }));

  return (
    <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 8 }}>
      {columns.map((column) => {
        const columnValue = column.items.reduce((sum, o) => sum + (o.value ?? 0), 0);
        const isDragTarget = dragOverStage === column.key;
        const baseBackground = TERMINAL_TINT[column.key] ?? appTokens.surfaceMuted;
        return (
          <div
            key={column.key}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOverStage(column.key);
            }}
            onDragLeave={() => setDragOverStage((prev) => (prev === column.key ? null : prev))}
            onDrop={(e) => {
              e.preventDefault();
              setDragOverStage(null);
              // Cleared here, not left to the dragged card's own onDragEnd -
              // a successful drop re-renders the board and moves this card
              // to a different column's list, which can unmount the
              // original DOM node before the browser fires its dragend
              // event on it, leaving the card stuck dim forever.
              setDraggingId(null);
              onMoveStage(e.dataTransfer.getData("text/plain"), column.key);
            }}
            style={{
              width: 284,
              flexShrink: 0,
              background: isDragTarget ? appTokens.primarySoft : baseBackground,
              borderRadius: appTokens.radius,
              padding: 10,
              border: isDragTarget ? `1.5px dashed ${appTokens.primary}` : "1px solid transparent",
              transition: "background 0.12s, border-color 0.12s",
            }}
          >
            <div style={{ padding: "6px 6px 12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: column.color, flexShrink: 0 }} />
                <Text strong style={{ fontSize: 13, color: appTokens.textPrimary, flex: 1 }}>
                  {column.label}
                </Text>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: appTokens.surface,
                    background: column.color,
                    borderRadius: 999,
                    minWidth: 18,
                    textAlign: "center",
                    padding: "1px 6px",
                  }}
                >
                  {column.items.length}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                <Text style={{ fontSize: 11.5, fontWeight: 600, color: appTokens.textSecondary }}>
                  {formatCompactCurrency(columnValue)}
                </Text>
                <Text style={{ fontSize: 11, color: appTokens.textTertiary }}>{column.subtitle}</Text>
              </div>
            </div>

            {loading && (
              <div
                style={{
                  border: `1px solid ${appTokens.borderLight}`,
                  borderRadius: appTokens.radiusSm,
                  padding: 12,
                  background: appTokens.surface,
                  marginBottom: 8,
                }}
              >
                <Skeleton active title={{ width: "60%" }} paragraph={{ rows: 2, width: ["40%", "80%"] }} />
              </div>
            )}

            {!loading && column.items.length === 0 && (
              <div
                style={{
                  textAlign: "center",
                  padding: "20px 8px",
                  border: `1px dashed ${appTokens.borderLight}`,
                  borderRadius: appTokens.radiusSm,
                  marginBottom: 8,
                }}
              >
                <Text style={{ fontSize: 11.5, color: appTokens.textTertiary }}>No deals here yet</Text>
              </div>
            )}

            {!loading &&
              column.items.map((opportunity) => (
                <OpportunityCard
                  key={opportunity.id}
                  opportunity={opportunity}
                  onClick={() => onCardClick(opportunity)}
                  onDragStart={() => setDraggingId(opportunity.id)}
                  onDragEnd={() => setDraggingId(null)}
                  dragging={draggingId === opportunity.id}
                />
              ))}

            {hasPermission("opportunities.create") && (
              <Button
                type="text"
                block
                size="small"
                icon={<PlusOutlined style={{ fontSize: 11 }} />}
                onClick={() => onAddToStage(column.key)}
                style={{ color: appTokens.textSecondary, fontWeight: 500 }}
              >
                Add
              </Button>
            )}
          </div>
        );
      })}
    </div>
  );
}
