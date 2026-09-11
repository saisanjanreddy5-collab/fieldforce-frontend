import { useEffect, useMemo, useState } from "react";
import { Button, Empty, Grid, Input, Spin, Typography, message } from "antd";
import { ArrowLeftOutlined, PlusOutlined, SearchOutlined } from "@ant-design/icons";
import * as leadApi from "../api/lead-api";
import type { Lead } from "../types/lead";
import { useAuth } from "../context/AuthContext";
import { LeadCard } from "../components/leads/LeadCard";
import { LeadFilterBar, type FilterTabDef } from "../components/leads/LeadFilterBar";
import { LeadDetail } from "../components/leads/LeadDetail";
import { LeadFormDrawer } from "../components/leads/LeadFormDrawer";
import { FiltersPanel, type AdvancedFilters } from "../components/leads/FiltersPanel";
import { ImportLeadsModal } from "../components/leads/ImportLeadsModal";
import { LeadMiningModal } from "../components/leads/LeadMiningModal";

const { Title } = Typography;
const { useBreakpoint } = Grid;

export default function LeadsPage() {
  const { user } = useAuth();
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>({});
  const [importOpen, setImportOpen] = useState(false);
  const [miningOpen, setMiningOpen] = useState(false);

  const load = () => {
    setLoading(true);
    leadApi
      .listLeads({ limit: 100 })
      .then(setLeads)
      .catch(() => message.error("Failed to load leads"))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const categories = useMemo(
    () => Array.from(new Set(leads.map((l) => l.category).filter((c): c is string => Boolean(c)))),
    [leads]
  );
  const statuses = useMemo(
    () => Array.from(new Set(leads.map((l) => l.status).filter((s): s is string => Boolean(s)))),
    [leads]
  );

  const tabs: FilterTabDef[] = useMemo(() => {
    const base: FilterTabDef[] = [
      { key: "all", label: "All leads", count: leads.length },
      { key: "myOpen", label: "My open leads", count: leads.filter((l) => l.ownerId === user?.id).length, dotColor: "#2a78d6" },
      { key: "unassigned", label: "Unassigned", count: leads.filter((l) => !l.ownerId).length, dotColor: "#eda100" },
      {
        key: "overdue",
        label: "Overdue follow-up",
        count: leads.filter((l) => l.hasOverdueActivity).length,
        dotColor: "#e34948",
      },
    ];
    for (const category of categories) {
      base.push({
        key: `category:${category}`,
        label: category,
        count: leads.filter((l) => l.category === category).length,
        dotColor: "#2a78d6",
      });
    }
    base.push({ key: "highScore", label: "High score", count: leads.filter((l) => (l.leadScore ?? 0) >= 70).length, dotColor: "#0ca30c" });
    return base;
  }, [leads, categories, user?.id]);

  const filteredLeads = useMemo(() => {
    let result = leads;

    if (activeTab === "myOpen") result = result.filter((l) => l.ownerId === user?.id);
    else if (activeTab === "unassigned") result = result.filter((l) => !l.ownerId);
    else if (activeTab === "overdue") result = result.filter((l) => l.hasOverdueActivity);
    else if (activeTab === "highScore") result = result.filter((l) => (l.leadScore ?? 0) >= 70);
    else if (activeTab.startsWith("category:")) {
      const category = activeTab.slice("category:".length);
      result = result.filter((l) => l.category === category);
    }

    if (advancedFilters.category) result = result.filter((l) => l.category === advancedFilters.category);
    if (advancedFilters.status) result = result.filter((l) => l.status === advancedFilters.status);

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (l) =>
          l.fullName.toLowerCase().includes(q) ||
          (l.companyName ?? "").toLowerCase().includes(q) ||
          (l.storeCity ?? "").toLowerCase().includes(q) ||
          (l.ownerName ?? "").toLowerCase().includes(q)
      );
    }

    return result;
  }, [leads, activeTab, search, user?.id, advancedFilters]);

  const selectedLead = leads.find((l) => l.id === selectedId) ?? null;

  const handleSaved = (lead: Lead) => {
    setDrawerOpen(false);
    setEditingLead(null);
    load();
    setSelectedId(lead.id);
  };

  const showDetailOnMobile = isMobile && selectedLead;

  return (
    <div>
      {!showDetailOnMobile && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
          <div>
            <Title level={3} style={{ margin: 0 }}>
              Leads
            </Title>
            <Typography.Text type="secondary">Franchise enquiries and inbound interest, assigned by region and category</Typography.Text>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Button onClick={() => setImportOpen(true)}>Import</Button>
            <Button onClick={() => setMiningOpen(true)}>Lead mining</Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                setEditingLead(null);
                setDrawerOpen(true);
              }}
            >
              New lead
            </Button>
          </div>
        </div>
      )}

      {!showDetailOnMobile && (
        <div style={{ marginBottom: 12 }}>
          <LeadFilterBar
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            totalCount={leads.length}
            shownCount={filteredLeads.length}
            filtersOpen={filtersOpen}
            onToggleFilters={() => setFiltersOpen((prev) => !prev)}
          />
          {filtersOpen && (
            <div style={{ marginTop: 12 }}>
              <FiltersPanel categories={categories} statuses={statuses} value={advancedFilters} onChange={setAdvancedFilters} />
            </div>
          )}
        </div>
      )}

      <div style={{ display: "flex", gap: 16 }}>
        {(!isMobile || !selectedLead) && (
          <div style={{ width: isMobile ? "100%" : 380, flexShrink: 0 }}>
            <Input
              placeholder="Search leads, company, city, owner"
              prefix={<SearchOutlined />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              allowClear
              style={{ marginBottom: 12 }}
            />
            <div style={{ maxHeight: isMobile ? undefined : "70vh", overflowY: isMobile ? undefined : "auto", border: "1px solid #f0f0f0", borderRadius: 8 }}>
              {loading ? (
                <div style={{ padding: 24, textAlign: "center" }}>
                  <Spin />
                </div>
              ) : filteredLeads.length === 0 ? (
                <Empty description="No leads match this filter" style={{ padding: 24 }} />
              ) : (
                filteredLeads.map((lead) => (
                  <LeadCard key={lead.id} lead={lead} selected={lead.id === selectedId} onClick={() => setSelectedId(lead.id)} />
                ))
              )}
            </div>
          </div>
        )}

        {!isMobile && (
          <div style={{ flex: 1, minWidth: 0, border: "1px solid #f0f0f0", borderRadius: 8, padding: 16 }}>
            {selectedLead ? (
              <LeadDetail
                lead={selectedLead}
                onEdit={() => {
                  setEditingLead(selectedLead);
                  setDrawerOpen(true);
                }}
              />
            ) : (
              <Empty description="Select a lead to see details" style={{ padding: 48 }} />
            )}
          </div>
        )}

        {isMobile && selectedLead && (
          <div style={{ width: "100%" }}>
            <Button icon={<ArrowLeftOutlined />} onClick={() => setSelectedId(null)} style={{ marginBottom: 12 }}>
              Back to list
            </Button>
            <LeadDetail
              lead={selectedLead}
              onEdit={() => {
                setEditingLead(selectedLead);
                setDrawerOpen(true);
              }}
            />
          </div>
        )}
      </div>

      <LeadFormDrawer
        open={drawerOpen}
        lead={editingLead}
        onClose={() => {
          setDrawerOpen(false);
          setEditingLead(null);
        }}
        onSaved={handleSaved}
      />
      <ImportLeadsModal open={importOpen} onClose={() => setImportOpen(false)} />
      <LeadMiningModal open={miningOpen} onClose={() => setMiningOpen(false)} />
    </div>
  );
}
