import { useEffect, useMemo, useRef, useState } from "react";
import { Button, Empty, Grid, Typography, message } from "antd";
import { ArrowLeftOutlined, PlusOutlined } from "@ant-design/icons";
import * as leadApi from "../api/lead-api";
import type { Lead, LeadListFilters } from "../types/lead";
import { useAuth } from "../context/AuthContext";
import { useHasPermission } from "../hooks/use-permission";
import { LeadQueue } from "../components/leads/LeadQueue";
import { LeadFilterToolbar } from "../components/leads/LeadFilterToolbar";
import type { QuickFilterKey } from "../components/leads/LeadFilterBar";
import type { AdvancedFilters } from "../components/leads/LeadFilters";
import { LeadDetail } from "../components/leads/LeadDetail";
import { LeadFormDrawer } from "../components/leads/LeadFormDrawer";
import { ImportLeadsModal } from "../components/leads/ImportLeadsModal";
import { LeadMiningModal } from "../components/leads/LeadMiningModal";
import { appTokens } from "../utils/design-system";

const { Title } = Typography;
const { useBreakpoint } = Grid;

const PAGE_SIZE = 30;

// Elements where arrow-key lead navigation must never fire, even though
// their container is nested inside the workspace - typing in any of these
// should behave like a normal text field, not move the selected lead.
function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable;
}

export default function LeadsPage() {
  const { user } = useAuth();
  const hasPermission = useHasPermission();
  const screens = useBreakpoint();
  // Below "lg" rather than "md" - at tablet widths (~768-900px) there isn't
  // enough room left for both the list column and a usable detail pane
  // once the sidebar and page margins are subtracted, so those widths get
  // the single-column "tap a lead to see it" mobile treatment too.
  const isMobile = !screens.lg;

  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [quickFilter, setQuickFilter] = useState<QuickFilterKey>("all");
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>({});
  const [counts, setCounts] = useState<leadApi.LeadQuickFilterCounts | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [miningOpen, setMiningOpen] = useState(false);
  const [railCollapsed, setRailCollapsed] = useState(false);

  const filters: LeadListFilters = useMemo(
    () => ({
      search: search.trim() || undefined,
      ownerId: quickFilter === "myLeads" ? "me" : undefined,
      unassignedOnly: quickFilter === "unassigned" || undefined,
      overdueOnly: quickFilter === "overdue" || undefined,
      highScoreOnly: quickFilter === "highScore" || undefined,
      category: quickFilter === "fofo" ? "FOFO" : advancedFilters.category,
      status: advancedFilters.status,
      consentPending: advancedFilters.consentPending || undefined,
    }),
    [search, quickFilter, advancedFilters]
  );

  // "me" isn't a real user id - resolved to the actual id below before any
  // request goes out, so the backend never sees a sentinel value.
  const resolvedFilters: LeadListFilters = useMemo(
    () => ({ ...filters, ownerId: filters.ownerId === "me" ? user?.id : filters.ownerId }),
    [filters, user?.id]
  );

  const load = (targetPage: number, append: boolean) => {
    if (append) setLoadingMore(true);
    else setLoading(true);
    leadApi
      .listLeads({ ...resolvedFilters, page: targetPage, limit: PAGE_SIZE })
      .then((result) => {
        setLeads((prev) => (append ? [...prev, ...result.leads] : result.leads));
        setTotal(result.total);
        setPage(targetPage);
      })
      .catch(() => message.error("Failed to load leads"))
      .finally(() => {
        setLoading(false);
        setLoadingMore(false);
      });
  };

  // Re-fetch from page 1 whenever search/filters change; debounced so
  // typing in search doesn't fire a request per keystroke.
  useEffect(() => {
    const handle = setTimeout(() => load(1, false), 300);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(resolvedFilters)]);

  // Quick-filter chip counts ignore the active filters themselves (they
  // show every bucket at once, e.g. "Overdue 3" while "My leads" is
  // selected) so they only need to refetch when the underlying lead data
  // could have changed, not on every filter toggle.
  useEffect(() => {
    leadApi
      .getQuickFilterCounts()
      .then(setCounts)
      .catch(() => undefined);
  }, [total]);

  const hasMore = leads.length < total;
  const loadMore = () => {
    if (loadingMore || loading) return;
    load(page + 1, true);
  };

  // Auto-select the first lead once loaded, so the detail panel isn't
  // empty - skipped on mobile, where list/detail are separate full-width
  // screens rather than a side-by-side split.
  useEffect(() => {
    if (isMobile || leads.length === 0) return;
    setSelectedId((current) => (current && leads.some((l) => l.id === current) ? current : leads[0].id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leads, isMobile]);

  const selectedLead = leads.find((l) => l.id === selectedId) ?? null;
  const selectedIndex = leads.findIndex((l) => l.id === selectedId);

  // Keyboard next/previous - only while the page itself has focus (not a
  // search box, form field, dropdown, or dialog), per Decision 6.
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;
      if (document.querySelector(".ant-modal-wrap, .ant-drawer-open, .ant-select-open, .ant-picker-dropdown")) return;
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
      if (leads.length === 0) return;
      e.preventDefault();
      const delta = e.key === "ArrowDown" ? 1 : -1;
      const nextIndex = Math.min(Math.max(selectedIndex + delta, 0), leads.length - 1);
      setSelectedId(leads[nextIndex].id);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [leads, selectedIndex]);

  const handleSaved = (lead: Lead, keepOpen: boolean) => {
    load(1, false);
    if (keepOpen) return;
    setDrawerOpen(false);
    setEditingLead(null);
    setSelectedId(lead.id);
  };

  // Quick filters are single-select (a segmented control) - the active
  // chip itself already shows which bucket is selected, so it doesn't also
  // need a removable tag below. Only the independent advanced filters
  // (which really do combine with the active quick filter, e.g. "My
  // leads" + "Stage: proposal") get a tag here.
  const activeFilterTags = [
    quickFilter !== "fofo" && advancedFilters.category && {
      key: "category",
      label: `Category: ${advancedFilters.category}`,
      onRemove: () => setAdvancedFilters((v) => ({ ...v, category: undefined })),
    },
    advancedFilters.status && {
      key: "status",
      label: `Stage: ${advancedFilters.status}`,
      onRemove: () => setAdvancedFilters((v) => ({ ...v, status: undefined })),
    },
    advancedFilters.consentPending && {
      key: "consentPending",
      label: "Consent pending",
      onRemove: () => setAdvancedFilters((v) => ({ ...v, consentPending: undefined })),
    },
  ].filter((t): t is { key: string; label: string; onRemove: () => void } => Boolean(t));

  const showDetailOnMobile = isMobile && selectedLead;
  const showOwner = user?.role !== "agent";

  return (
    <div ref={containerRef} style={{ fontFamily: appTokens.font }}>
      {!showDetailOnMobile && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 8 }}>
          <div>
            <Title level={3} style={{ margin: 0, letterSpacing: -0.3, color: appTokens.textPrimary }}>
              Leads
            </Title>
            <Typography.Text style={{ color: appTokens.textSecondary, fontSize: 13.5 }}>
              {total} lead{total === 1 ? "" : "s"} · Franchise enquiries and inbound interest
            </Typography.Text>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Button onClick={() => setImportOpen(true)}>Import</Button>
            <Button onClick={() => setMiningOpen(true)}>Lead mining</Button>
            {hasPermission("leads.create") && (
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
            )}
          </div>
        </div>
      )}

      {!showDetailOnMobile && (
        <LeadFilterToolbar
          quickFilter={quickFilter}
          onQuickFilterChange={setQuickFilter}
          advancedFilters={advancedFilters}
          onAdvancedFiltersChange={setAdvancedFilters}
          activeFilterTags={activeFilterTags}
          counts={counts}
          total={total}
          loading={loading}
        />
      )}

      {isMobile ? (
        <div style={{ display: "flex" }}>
          {!selectedLead && (
            <div
              style={{
                width: "100%",
                border: `1px solid ${appTokens.border}`,
                borderRadius: appTokens.radius,
                background: appTokens.surface,
                boxShadow: appTokens.shadowXs,
              }}
            >
              <LeadQueue
                leads={leads}
                total={total}
                loading={loading}
                loadingMore={loadingMore}
                hasMore={hasMore}
                onLoadMore={loadMore}
                selectedId={selectedId}
                onSelect={setSelectedId}
                showOwner={showOwner}
                search={search}
                onSearchChange={setSearch}
                collapsed={false}
                onToggleCollapsed={() => undefined}
              />
            </div>
          )}
          {selectedLead && (
            <div style={{ width: "100%" }}>
              <Button icon={<ArrowLeftOutlined />} onClick={() => setSelectedId(null)} style={{ marginBottom: 12 }}>
                Back to list
              </Button>
              <div
                style={{
                  border: `1px solid ${appTokens.border}`,
                  borderRadius: appTokens.radius,
                  background: appTokens.surface,
                  boxShadow: appTokens.shadowXs,
                  padding: 20,
                }}
              >
                <LeadDetail
                  lead={selectedLead}
                  showOwner={showOwner}
                  onEdit={() => {
                    setEditingLead(selectedLead);
                    setDrawerOpen(true);
                  }}
                />
              </div>
            </div>
          )}
        </div>
      ) : (
        // One shared card for list + detail, divided by a single internal
        // border, instead of two separate floating boxes with a gap between
        // them - a visibly boxy "two cards" look was the specific complaint,
        // and a real CRM workspace reads as one continuous surface.
        <div
          style={{
            display: "flex",
            border: `1px solid ${appTokens.border}`,
            borderRadius: appTokens.radius,
            background: appTokens.surface,
            boxShadow: appTokens.shadowXs,
            height: "75vh",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: railCollapsed ? 44 : 420,
              flexShrink: 0,
              borderRight: `1px solid ${appTokens.borderLight}`,
              height: "100%",
            }}
          >
            <LeadQueue
              leads={leads}
              total={total}
              loading={loading}
              loadingMore={loadingMore}
              hasMore={hasMore}
              onLoadMore={loadMore}
              selectedId={selectedId}
              onSelect={setSelectedId}
              showOwner={showOwner}
              search={search}
              onSearchChange={setSearch}
              collapsed={railCollapsed}
              onToggleCollapsed={() => setRailCollapsed((v) => !v)}
            />
          </div>

          <div style={{ flex: 1, minWidth: 0, padding: 20, overflowY: "auto" }}>
            {selectedLead ? (
              // Capped, not flex-stretched - on a wide monitor the detail
              // pane would otherwise keep expanding indefinitely while the
              // list rail stays a fixed width, which is exactly what read as
              // "the list is too small and the detail is too big."
              <div style={{ maxWidth: 960 }}>
                <LeadDetail
                  lead={selectedLead}
                  showOwner={showOwner}
                  onEdit={() => {
                    setEditingLead(selectedLead);
                    setDrawerOpen(true);
                  }}
                />
              </div>
            ) : (
              <Empty description="Select a lead to see details" style={{ padding: 48 }} />
            )}
          </div>
        </div>
      )}

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
