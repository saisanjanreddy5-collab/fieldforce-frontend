import { useEffect, useMemo, useState } from "react";
import { App, Button, Segmented, Select, Typography } from "antd";
import { AppstoreOutlined, BarChartOutlined, PlusOutlined, TableOutlined, TeamOutlined } from "@ant-design/icons";
import * as opportunityApi from "../api/opportunity-api";
import * as userApi from "../api/user-api";
import * as leadApi from "../api/lead-api";
import * as salesTeamApi from "../api/sales-team-api";
import * as teamRollupApi from "../api/team-rollup-api";
import type { Opportunity } from "../types/opportunity";
import type { TeamMember } from "../types/user";
import type { SalesTeam, Zone } from "../types/sales-team";
import type { TeamRollupGroup } from "../types/team-rollup";
import { formatCompactCurrency } from "../utils/lead-format";
import { KanbanBoard } from "../components/opportunities/KanbanBoard";
import { OpportunityListView } from "../components/opportunities/OpportunityListView";
import { TeamRollupView } from "../components/opportunities/TeamRollupView";
import { ForecastView } from "../components/opportunities/ForecastView";
import { NewOpportunityModal } from "../components/opportunities/NewOpportunityModal";
import { EditOpportunityDrawer } from "../components/opportunities/EditOpportunityDrawer";
import { CATEGORY_COLORS, STAGE_DEFAULT_PROBABILITY, STAGE_OPTIONS } from "../components/opportunities/stages";
import { useHasPermission } from "../hooks/use-permission";
import { appTokens } from "../utils/design-system";

const { Title, Text } = Typography;

const CATEGORY_OPTIONS = Object.keys(CATEGORY_COLORS).map((c) => ({ value: c, label: c }));

const FILTER_DOT = <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: "#9aa2b1" }} />;

type View = "kanban" | "list" | "team-rollup" | "forecast";

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

  const [rollupGroups, setRollupGroups] = useState<TeamRollupGroup[]>([]);
  const [rollupLoading, setRollupLoading] = useState(true);
  const [rollupLoaded, setRollupLoaded] = useState(false);

  const load = () => {
    setLoading(true);
    opportunityApi
      .listOpportunities()
      .then(setOpportunities)
      .catch(() => message.error("Failed to load opportunities"))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  // Lazy-loaded the first time this tab is actually opened, not on page
  // load - it's a heavier aggregation query than the other three views and
  // most sessions never visit it.
  useEffect(() => {
    if (view !== "team-rollup" || rollupLoaded) return;
    setRollupLoading(true);
    teamRollupApi
      .getTeamRollup()
      .then(setRollupGroups)
      .catch(() => message.error("Failed to load team rollup"))
      .finally(() => {
        setRollupLoading(false);
        setRollupLoaded(true);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);
  useEffect(() => {
    userApi.listUsers().then(setUsers).catch(() => undefined);
    salesTeamApi.listZones().then(setZones).catch(() => undefined);
    salesTeamApi.listSalesTeams().then(setSalesTeams).catch(() => undefined);
    leadApi.listTerritories().then(setTerritories).catch(() => undefined);
  }, []);

  const managerOptions = useMemo(() => users.filter((u) => u.role === "manager" || u.role === "admin"), [users]);

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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
        <div>
          <Title level={3} style={{ margin: 0, letterSpacing: -0.3, color: appTokens.textPrimary }}>
            Opportunity pipeline
          </Title>
          <Text style={{ color: appTokens.textSecondary, fontSize: 13.5 }}>Drag a card to move it between stages. Lost reasons are captured on exit.</Text>
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <Segmented
            value={view}
            onChange={(v) => setView(v as View)}
            options={[
              { label: "Kanban", value: "kanban", icon: <AppstoreOutlined /> },
              { label: "List", value: "list", icon: <TableOutlined /> },
              { label: "Team rollup", value: "team-rollup", icon: <TeamOutlined /> },
              { label: "Forecast", value: "forecast", icon: <BarChartOutlined /> },
            ]}
          />
          {hasPermission("opportunities.create") && (
            <Button type="primary" icon={<PlusOutlined />} onClick={() => { setNewModalStage(undefined); setNewModalOpen(true); }}>
              New opportunity
            </Button>
          )}
        </div>
      </div>

      <div style={{ marginBottom: 10 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <Select
            prefix={FILTER_DOT}
            style={{ width: 140, flexShrink: 0 }}
            value={zoneFilter ?? "all"}
            onChange={(v) => setZoneFilter(v === "all" ? undefined : v)}
            options={[{ value: "all", label: "All regions" }, ...zones.map((z) => ({ value: z.id, label: z.name }))]}
          />
          <Select
            prefix={FILTER_DOT}
            showSearch
            optionFilterProp="label"
            style={{ width: 160, flexShrink: 0 }}
            value={territoryFilter ?? "all"}
            onChange={(v) => setTerritoryFilter(v === "all" ? undefined : v)}
            options={[{ value: "all", label: "All territories" }, ...territories.map((t) => ({ value: t, label: t }))]}
          />
          <Select
            prefix={FILTER_DOT}
            style={{ width: 160, flexShrink: 0 }}
            value={salesTeamFilter ?? "all"}
            onChange={(v) => setSalesTeamFilter(v === "all" ? undefined : v)}
            options={[
              { value: "all", label: "All sales teams" },
              ...salesTeams.map((t) => ({ value: t.id, label: t.region ? `${t.name} (${t.region})` : t.name })),
            ]}
          />
          <Select
            prefix={FILTER_DOT}
            style={{ width: 160, flexShrink: 0 }}
            value={managerFilter ?? "all"}
            onChange={(v) => setManagerFilter(v === "all" ? undefined : v)}
            options={[{ value: "all", label: "All managers" }, ...managerOptions.map((u) => ({ value: u.id, label: u.name }))]}
          />
          <Select
            prefix={FILTER_DOT}
            style={{ width: 180, flexShrink: 0 }}
            value={ownerFilter ?? "all"}
            onChange={(v) => setOwnerFilter(v === "all" ? undefined : v)}
            options={[{ value: "all", label: "All salespersons" }, ...users.map((u) => ({ value: u.id, label: u.name }))]}
          />
          <Select
            prefix={FILTER_DOT}
            style={{ width: 160, flexShrink: 0 }}
            value={stageFilter ?? "all"}
            onChange={(v) => setStageFilter(v === "all" ? undefined : v)}
            options={[{ value: "all", label: "All stages" }, ...STAGE_OPTIONS]}
          />
          <Select
            prefix={FILTER_DOT}
            style={{ width: 160, flexShrink: 0 }}
            value={categoryFilter ?? "all"}
            onChange={(v) => setCategoryFilter(v === "all" ? undefined : v)}
            options={[{ value: "all", label: "All categories" }, ...CATEGORY_OPTIONS]}
          />
          {hasActiveFilters && (
            <Button onClick={clearFilters} style={{ flexShrink: 0 }}>
              Clear
            </Button>
          )}
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
        {[
          { label: "Open opportunities", value: String(stats.openCount), subtitle: "in view", color: appTokens.textPrimary },
          { label: "Pipeline value", value: formatCompactCurrency(stats.pipelineValue), subtitle: "unweighted", color: appTokens.textPrimary },
          { label: "Weighted forecast", value: formatCompactCurrency(stats.weightedForecast), subtitle: "probability adjusted", color: appTokens.primary },
          { label: "Avg deal size", value: formatCompactCurrency(stats.avgDealSize), subtitle: "this view", color: appTokens.textPrimary },
        ].map((stat) => (
          <div
            key={stat.label}
            style={{
              flex: 1,
              minWidth: 170,
              border: `1px solid ${appTokens.borderLight}`,
              borderRadius: appTokens.radius,
              padding: "10px 14px",
              background: appTokens.surface,
              boxShadow: appTokens.shadowXs,
            }}
          >
            <Text style={{ fontSize: 11.5, fontWeight: 600, color: appTokens.textTertiary, display: "block" }}>{stat.label}</Text>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 1 }}>
              <span style={{ fontSize: 19, fontWeight: 700, color: stat.color, letterSpacing: -0.3, lineHeight: 1.3 }}>{stat.value}</span>
              <Text style={{ fontSize: 11, color: appTokens.textTertiary }}>{stat.subtitle}</Text>
            </div>
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
      {view === "team-rollup" && <TeamRollupView groups={rollupGroups} loading={rollupLoading} />}
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
