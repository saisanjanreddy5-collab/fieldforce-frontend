import { useEffect, useMemo, useState } from "react";
import { App, Button, Empty, Segmented, Select, Typography } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import * as opportunityApi from "../api/opportunity-api";
import * as userApi from "../api/user-api";
import * as leadApi from "../api/lead-api";
import * as salesTeamApi from "../api/sales-team-api";
import type { Opportunity } from "../types/opportunity";
import type { TeamMember } from "../types/user";
import type { SalesTeam, Zone } from "../types/sales-team";
import { formatCompactCurrency } from "../utils/lead-format";
import { KanbanBoard } from "../components/opportunities/KanbanBoard";
import { OpportunityListView } from "../components/opportunities/OpportunityListView";
import { ForecastView } from "../components/opportunities/ForecastView";
import { NewOpportunityModal } from "../components/opportunities/NewOpportunityModal";
import { EditOpportunityDrawer } from "../components/opportunities/EditOpportunityDrawer";
import { CATEGORY_COLORS, STAGE_DEFAULT_PROBABILITY, STAGE_OPTIONS } from "../components/opportunities/stages";
import { useDraggableScroll } from "../hooks/use-draggable-scroll";
import { useHasPermission } from "../hooks/use-permission";
import { ScrollTrack } from "../components/ScrollTrack";

const { Title, Text } = Typography;

const CATEGORY_OPTIONS = Object.keys(CATEGORY_COLORS).map((c) => ({ value: c, label: c }));

const FILTER_DOT = <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: "#c3c2b7" }} />;

type View = "kanban" | "list" | "team-rollup" | "forecast";

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ flexShrink: 0 }}>
      <Text type="secondary" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 0.4, display: "block", marginBottom: 4 }}>
        {label}
      </Text>
      {children}
    </div>
  );
}

export default function OpportunitiesPage() {
  const { message } = App.useApp();
  const hasPermission = useHasPermission();
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [users, setUsers] = useState<TeamMember[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [salesTeams, setSalesTeams] = useState<SalesTeam[]>([]);
  const [territories, setTerritories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>("kanban");

  const [categoryFilter, setCategoryFilter] = useState<string | undefined>();
  const [ownerFilter, setOwnerFilter] = useState<string | undefined>();
  const [managerFilter, setManagerFilter] = useState<string | undefined>();
  const [stageFilter, setStageFilter] = useState<string | undefined>();
  const [zoneFilter, setZoneFilter] = useState<string | undefined>();
  const [territoryFilter, setTerritoryFilter] = useState<string | undefined>();
  const [salesTeamFilter, setSalesTeamFilter] = useState<string | undefined>();

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
    salesTeamApi.listZones().then(setZones).catch(() => undefined);
    salesTeamApi.listSalesTeams().then(setSalesTeams).catch(() => undefined);
    leadApi.listTerritories().then(setTerritories).catch(() => undefined);
  }, []);

  const managerOptions = useMemo(() => users.filter((u) => u.role === "manager" || u.role === "admin"), [users]);
  const filterScroll = useDraggableScroll([zones, territories, salesTeams, users]);

  const filtered = useMemo(() => {
    return opportunities.filter((o) => {
      if (categoryFilter && o.leadCategory !== categoryFilter) return false;
      if (ownerFilter && o.ownerId !== ownerFilter) return false;
      if (stageFilter && o.stage !== stageFilter) return false;
      if (zoneFilter && o.leadZoneId !== zoneFilter) return false;
      if (territoryFilter && o.leadTerritory !== territoryFilter) return false;
      if (salesTeamFilter && o.leadSalesTeamId !== salesTeamFilter) return false;
      if (managerFilter) {
        const owner = users.find((u) => u.id === o.ownerId);
        if (!owner || owner.managerId !== managerFilter) return false;
      }
      return true;
    });
  }, [opportunities, categoryFilter, ownerFilter, stageFilter, zoneFilter, territoryFilter, salesTeamFilter, managerFilter, users]);

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

  const hasActiveFilters =
    categoryFilter || ownerFilter || managerFilter || stageFilter || zoneFilter || territoryFilter || salesTeamFilter;
  const clearFilters = () => {
    setCategoryFilter(undefined);
    setOwnerFilter(undefined);
    setManagerFilter(undefined);
    setStageFilter(undefined);
    setZoneFilter(undefined);
    setTerritoryFilter(undefined);
    setSalesTeamFilter(undefined);
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
          <Text type="secondary">Drag a card to move it between stages. Lost reasons are captured on exit.</Text>
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <Segmented
            value={view}
            onChange={(v) => setView(v as View)}
            options={[
              { label: "Kanban", value: "kanban" },
              { label: "List", value: "list" },
              { label: "Team rollup", value: "team-rollup" },
              { label: "Forecast", value: "forecast" },
            ]}
          />
          <Button onClick={() => setView("forecast")}>Forecast</Button>
          {hasPermission("opportunities.create") && (
            <Button type="primary" icon={<PlusOutlined />} onClick={() => { setNewModalStage(undefined); setNewModalOpen(true); }}>
              New opportunity
            </Button>
          )}
        </div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <div ref={filterScroll.scrollRef} className="scrollbar-hidden" style={{ display: "flex", gap: 12, overflowX: "auto", alignItems: "flex-end", paddingBottom: 2 }}>
          <FilterField label="Region">
            <Select
              allowClear
              prefix={FILTER_DOT}
              placeholder="All regions"
              style={{ width: 140 }}
              value={zoneFilter}
              onChange={setZoneFilter}
              options={zones.map((z) => ({ value: z.id, label: z.name }))}
            />
          </FilterField>
          <FilterField label="Territory">
            <Select
              allowClear
              prefix={FILTER_DOT}
              showSearch
              placeholder="All territories"
              style={{ width: 160 }}
              value={territoryFilter}
              onChange={setTerritoryFilter}
              options={territories.map((t) => ({ value: t, label: t }))}
            />
          </FilterField>
          <FilterField label="Sales team">
            <Select
              allowClear
              prefix={FILTER_DOT}
              placeholder="All sales teams"
              style={{ width: 160 }}
              value={salesTeamFilter}
              onChange={setSalesTeamFilter}
              options={salesTeams.map((t) => ({ value: t.id, label: t.region ? `${t.name} (${t.region})` : t.name }))}
            />
          </FilterField>
          <FilterField label="Manager">
            <Select
              allowClear
              prefix={FILTER_DOT}
              placeholder="All managers"
              style={{ width: 160 }}
              value={managerFilter}
              onChange={setManagerFilter}
              options={managerOptions.map((u) => ({ value: u.id, label: u.name }))}
            />
          </FilterField>
          <FilterField label="Salesperson">
            <Select
              allowClear
              prefix={FILTER_DOT}
              placeholder="All salespersons"
              style={{ width: 180 }}
              value={ownerFilter}
              onChange={setOwnerFilter}
              options={users.map((u) => ({ value: u.id, label: u.name }))}
            />
          </FilterField>
          <FilterField label="Stage">
            <Select
              allowClear
              prefix={FILTER_DOT}
              placeholder="All stages"
              style={{ width: 160 }}
              value={stageFilter}
              onChange={setStageFilter}
              options={STAGE_OPTIONS}
            />
          </FilterField>
        </div>
        <ScrollTrack
          track={filterScroll.track}
          dragging={filterScroll.dragging}
          trackRef={filterScroll.trackRef}
          onTrackClick={filterScroll.handleTrackClick}
          onThumbPointerDown={filterScroll.handleThumbPointerDown}
          onThumbPointerMove={filterScroll.handleThumbPointerMove}
          onThumbPointerUp={filterScroll.handleThumbPointerUp}
        />
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16, alignItems: "flex-end" }}>
        <FilterField label="Category">
          <Select
            allowClear
            prefix={FILTER_DOT}
            placeholder="All categories"
            style={{ width: 160 }}
            value={categoryFilter}
            onChange={setCategoryFilter}
            options={CATEGORY_OPTIONS}
          />
        </FilterField>
        {hasActiveFilters && <Button onClick={clearFilters}>Clear</Button>}
      </div>

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 16 }}>
        {[
          { label: "Open opportunities", value: String(stats.openCount), subtitle: "in view" },
          { label: "Pipeline value", value: formatCompactCurrency(stats.pipelineValue), subtitle: "unweighted" },
          { label: "Weighted forecast", value: formatCompactCurrency(stats.weightedForecast), subtitle: "probability adjusted" },
          { label: "Avg deal size", value: formatCompactCurrency(stats.avgDealSize), subtitle: "this view" },
        ].map((stat) => (
          <div key={stat.label} style={{ flex: 1, minWidth: 160, border: "1px solid #f0f0f0", borderRadius: 8, padding: 12 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {stat.label}
            </Text>
            <div style={{ fontSize: 20, fontWeight: 600 }}>{stat.value}</div>
            <Text type="secondary" style={{ fontSize: 11 }}>
              {stat.subtitle}
            </Text>
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
      {view === "team-rollup" && (
        <Empty
          description="Team rollup needs quota/target data, which hasn't been set up yet"
          style={{ marginTop: 48 }}
        />
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
