import { useState } from "react";
import { Button, Typography } from "antd";
import type { Opportunity } from "../../types/opportunity";
import { formatCompactCurrency } from "../../utils/lead-format";
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
              width: 260,
              flexShrink: 0,
              background: isDragTarget ? "#e6f4ff" : "#fafafa",
              borderRadius: 8,
              padding: 8,
              border: isDragTarget ? "1px dashed #1677ff" : "1px solid transparent",
            }}
          >
            <div style={{ padding: "4px 4px 8px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <Text strong style={{ fontSize: 13 }}>
                  {column.label}
                </Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {column.items.length}
                </Text>
              </div>
              <Text type="secondary" style={{ fontSize: 11 }}>
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

            <Button type="dashed" block size="small" onClick={() => onAddToStage(column.key)}>
              + Add
            </Button>
          </div>
        );
      })}
    </div>
  );
}
