import { useState } from "react";
import { Button, Typography } from "antd";
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

export function KanbanBoard({ opportunities, loading, onCardClick, onAddToStage, onMoveStage }: KanbanBoardProps) {
  const hasPermission = useHasPermission();
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);

  const columns = STAGES.map((stage) => ({ ...stage, items: opportunities.filter((o) => o.stage === stage.key) }));

  return (
    <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 8 }}>
      {columns.map((column) => {
        const columnValue = column.items.reduce((sum, o) => sum + (o.value ?? 0), 0);
        const isDragTarget = dragOverStage === column.key;
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
              onMoveStage(e.dataTransfer.getData("text/plain"), column.key);
            }}
            style={{
              width: 268,
              flexShrink: 0,
              background: isDragTarget ? appTokens.primarySoft : appTokens.surfaceMuted,
              borderRadius: appTokens.radius,
              padding: 10,
              border: isDragTarget ? `1px dashed ${appTokens.primary}` : "1px solid transparent",
              transition: "background 0.12s, border-color 0.12s",
            }}
          >
            <div style={{ padding: "4px 6px 10px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <Text strong style={{ fontSize: 13, color: appTokens.textPrimary }}>
                  {column.label}
                </Text>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: appTokens.textSecondary,
                    background: appTokens.surface,
                    borderRadius: 999,
                    padding: "1px 7px",
                    border: `1px solid ${appTokens.border}`,
                  }}
                >
                  {column.items.length}
                </span>
              </div>
              <Text style={{ fontSize: 11, color: appTokens.textTertiary }}>
                {formatCompactCurrency(columnValue)} · {column.subtitle}
              </Text>
            </div>

            {!loading &&
              column.items.map((opportunity) => (
                <OpportunityCard
                  key={opportunity.id}
                  opportunity={opportunity}
                  onClick={() => onCardClick(opportunity)}
                  onDragStart={() => undefined}
                />
              ))}

            {hasPermission("opportunities.create") && (
              <Button type="dashed" block size="small" onClick={() => onAddToStage(column.key)}>
                + Add
              </Button>
            )}
          </div>
        );
      })}
    </div>
  );
}
