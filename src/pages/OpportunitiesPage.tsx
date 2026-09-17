import { useEffect, useMemo, useState } from "react";
import { App, Button, Segmented, Select, Tooltip, Typography } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import * as opportunityApi from "../api/opportunity-api";
import * as userApi from "../api/user-api";
import type { Opportunity } from "../types/opportunity";
import type { TeamMember } from "../types/user";
import { formatCompactCurrency } from "../utils/lead-format";
import { KanbanBoard } from "../components/opportunities/KanbanBoard";
import { OpportunityListView } from "../components/opportunities/OpportunityListView";
import { ForecastView } from "../components/opportunities/ForecastView";
import { NewOpportunityModal } from "../components/opportunities/NewOpportunityModal";
import { EditOpportunityDrawer } from "../components/opportunities/EditOpportunityDrawer";
import { CATEGORY_COLORS, STAGE_DEFAULT_PROBABILITY, STAGE_OPTIONS } from "../components/opportunities/stages";

const { Title, Text } = Typography;

const CATEGORY_OPTIONS = Object.keys(CATEGORY_COLORS).map((c) => ({ value: c, label: c }));
const DISABLED_FILTER_TOOLTIP = "No region/territory/sales-team data has been set up yet";

type View = "kanban" | "list" | "forecast";

export default function OpportunitiesPage() {
  const { message } = App.useApp();
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [users, setUsers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>("kanban");

  const [categoryFilter, setCategoryFilter] = useState<string | undefined>();
  const [ownerFilter, setOwnerFilter] = useState<string | undefined>();
  const [managerFilter, setManagerFilter] = useState<string | undefined>();
  const [stageFilter, setStageFilter] = useState<string | undefined>();

  const [newModalOpen, setNewModalOpen] = useState(false);
  const [newModalStage, setNewModalStage] = useState<string | undefined>();
  const [editingOpportunity, setEditingOpportunity] = useState<Opportunity | null>(null);

  const load = () => {
    setLoading(true);
    opportunityApi
      .listOpportunities()
      .then(setOpportunities)
      .catch(() => message.error("Failed to load opportunities"))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);
  useEffect(() => {
    userApi.listUsers().then(setUsers).catch(() => undefined);
  }, []);

  const managerOptions = useMemo(() => users.filter((u) => u.role === "manager" || u.role === "admin"), [users]);

  const filtered = useMemo(() => {
    return opportunities.filter((o) => {
      if (categoryFilter && o.leadCategory !== categoryFilter) return false;
      if (ownerFilter && o.ownerId !== ownerFilter) return false;
      if (stageFilter && o.stage !== stageFilter) return false;
      if (managerFilter) {
        const owner = users.find((u) => u.id === o.ownerId);
        if (!owner || owner.managerId !== managerFilter) return false;
      }
      return true;
    });
  }, [opportunities, categoryFilter, ownerFilter, stageFilter, managerFilter, users]);

  const stats = useMemo(() => {
    const open = filtered.filter((o) => o.stage !== "won" && o.stage !== "lost");
    const pipelineValue = open.reduce((sum, o) => sum + (o.value ?? 0), 0);
    const weightedForecast = open.reduce((sum, o) => {
      const probability = o.probability ?? STAGE_DEFAULT_PROBABILITY[o.stage] ?? 0;
      return sum + (o.value ?? 0) * (probability / 100);
    }, 0);
    const avgDealSize = open.length > 0 ? pipelineValue / open.length : 0;
    return { openCount: open.length, pipelineValue, weightedForecast, avgDealSize };
  }, [filtered]);

  const hasActiveFilters = categoryFilter || ownerFilter || managerFilter || stageFilter;
  const clearFilters = () => {
    setCategoryFilter(undefined);
    setOwnerFilter(undefined);
    setManagerFilter(undefined);
    setStageFilter(undefined);
  };

  const handleMoveStage = async (opportunityId: string, stageKey: string) => {
    const opportunity = opportunities.find((o) => o.id === opportunityId);
    if (!opportunity || opportunity.stage === stageKey) return;

    const previous = opportunities;
    setOpportunities((prev) => prev.map((o) => (o.id === opportunityId ? { ...o, stage: stageKey } : o)));
    try {
      await opportunityApi.updateOpportunity(opportunityId, { stage: stageKey });
    } catch {
      message.error("Failed to move opportunity");
      setOpportunities(previous);
    }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>
            Opportunity pipeline
          </Title>
          <Text type="secondary">Drag a card to move it between stages</Text>
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <Segmented
            value={view}
            onChange={(v) => setView(v as View)}
            options={[
              { label: "Kanban", value: "kanban" },
              { label: "List", value: "list" },
              { label: "Forecast", value: "forecast" },
            ]}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={() => { setNewModalStage(undefined); setNewModalOpen(true); }}>
            New opportunity
          </Button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 8 }}>
        <Tooltip title={DISABLED_FILTER_TOOLTIP}>
          <Select disabled placeholder="All regions" style={{ width: 140 }} />
        </Tooltip>
        <Tooltip title={DISABLED_FILTER_TOOLTIP}>
          <Select disabled placeholder="All territories" style={{ width: 140 }} />
        </Tooltip>
        <Tooltip title={DISABLED_FILTER_TOOLTIP}>
          <Select disabled placeholder="All sales teams" style={{ width: 140 }} />
        </Tooltip>
        <Select
          allowClear
          placeholder="All managers"
          style={{ width: 160 }}
          value={managerFilter}
          onChange={setManagerFilter}
          options={managerOptions.map((u) => ({ value: u.id, label: u.name }))}
        />
        <Select
          allowClear
          placeholder="All salespersons"
          style={{ width: 180 }}
          value={ownerFilter}
          onChange={setOwnerFilter}
          options={users.map((u) => ({ value: u.id, label: u.name }))}
        />
        <Select
          allowClear
          placeholder="All stages"
          style={{ width: 160 }}
          value={stageFilter}
          onChange={setStageFilter}
          options={STAGE_OPTIONS}
        />
      </div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
        <Select
          allowClear
          placeholder="All categories"
          style={{ width: 160 }}
          value={categoryFilter}
          onChange={setCategoryFilter}
          options={CATEGORY_OPTIONS}
        />
        {hasActiveFilters && <Button onClick={clearFilters}>Clear</Button>}
      </div>

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 16 }}>
        {[
          { label: "Open opportunities", value: String(stats.openCount) },
          { label: "Pipeline value", value: formatCompactCurrency(stats.pipelineValue) },
          { label: "Weighted forecast", value: formatCompactCurrency(stats.weightedForecast) },
          { label: "Avg deal size", value: formatCompactCurrency(stats.avgDealSize) },
        ].map((stat) => (
          <div key={stat.label} style={{ flex: 1, minWidth: 160, border: "1px solid #f0f0f0", borderRadius: 8, padding: 12 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {stat.label}
            </Text>
            <div style={{ fontSize: 20, fontWeight: 600 }}>{stat.value}</div>
          </div>
        ))}
      </div>

      {view === "kanban" && (
        <KanbanBoard
          opportunities={filtered}
          loading={loading}
          onCardClick={setEditingOpportunity}
          onAddToStage={(stageKey) => {
            setNewModalStage(stageKey);
            setNewModalOpen(true);
          }}
          onMoveStage={handleMoveStage}
        />
      )}
      {view === "list" && (
        <OpportunityListView opportunities={filtered} loading={loading} onEdit={setEditingOpportunity} />
      )}
      {view === "forecast" && <ForecastView opportunities={filtered} />}

      <NewOpportunityModal
        open={newModalOpen}
        onClose={() => setNewModalOpen(false)}
        defaultStage={newModalStage}
        onCreated={() => {
          setNewModalOpen(false);
          load();
        }}
      />

      <EditOpportunityDrawer
        opportunity={editingOpportunity}
        onClose={() => setEditingOpportunity(null)}
        onUpdated={() => {
          setEditingOpportunity(null);
          load();
        }}
      />
    </div>
  );
}
