import { useEffect, useMemo, useRef, useState } from "react";
import { Button, Empty, Grid, Popover, Typography, message } from "antd";
import { ArrowLeftOutlined, DownOutlined, PlusOutlined } from "@ant-design/icons";
import { useSearchParams } from "react-router-dom";
import * as leadApi from "../api/lead-api";
import type { Lead, LeadListFilters } from "../types/lead";
import { useAuth } from "../context/AuthContext";
import { useHasPermission } from "../hooks/use-permission";
import { LeadQueue } from "../components/leads/LeadQueue";
import { LeadFilterToolbar } from "../components/leads/LeadFilterToolbar";
import { LeadFilterBar, QUICK_FILTERS, type QuickFilterKey } from "../components/leads/LeadFilterBar";
import type { AdvancedFilters } from "../components/leads/LeadFilters";
import { LeadDetail } from "../components/leads/LeadDetail";
import { LeadFormDrawer } from "../components/leads/LeadFormDrawer";
import { ImportLeadsModal } from "../components/leads/ImportLeadsModal";
import { exportToXlsx } from "../utils/export-xlsx";
import { appTokens } from "../utils/design-system";

const { useBreakpoint } = Grid;
const { Text } = Typography;

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
  const [railCollapsed, setRailCollapsed] = useState(false);
  const [quickFilterOpen, setQuickFilterOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const [deepLinkedLead, setDeepLinkedLead] = useState<Lead | null>(null);
  const [deepLinkedTab, setDeepLinkedTab] = useState<string | undefined>();

  // Cross-module handoff (e.g. the Activity calendar's WhatsApp button
  // jumping here to open a specific lead's WhatsApp tab). Kept as its own
  // state rather than merged into `leads` - that array gets wholly replaced
  // by the normal paginated/filtered load below, which would otherwise
  // evict this lead moments after it appears if it isn't part of that
  // query's results.
  useEffect(() => {
    const leadIdParam = searchParams.get("leadId");
    if (!leadIdParam) return;
    setDeepLinkedTab(searchParams.get("tab") ?? undefined);
    leadApi
      .getLead(leadIdParam)
      .then((lead) => {
        setDeepLinkedLead(lead);
        setSelectedId(lead.id);
      })
      .catch(() => message.error("Failed to load the requested lead"));
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete("leadId");
        next.delete("tab");
        return next;
      },
      { replace: true }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    setSelectedId((current) =>
      current && (current === deepLinkedLead?.id || leads.some((l) => l.id === current)) ? current : leads[0].id
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leads, isMobile]);

  const selectedLead = (deepLinkedLead?.id === selectedId ? deepLinkedLead : leads.find((l) => l.id === selectedId)) ?? null;
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

  const handleExportLeads = () =>
    exportToXlsx(
      "Leads",
      [
        { header: "Lead #", key: "leadNumber" },
        { header: "Name", key: "fullName" },
        { header: "Phone", key: "phone" },
        { header: "Email", key: "email" },
        { header: "Company", key: "companyName" },
        { header: "Category", key: "category" },
        { header: "Status", key: "status" },
        { header: "Owner", key: "ownerName" },
        { header: "Territory", key: "territory" },
        { header: "Source", key: "source" },
        { header: "Expected value", key: "expectedValue" },
      ],
      leads.map((l) => ({ ...l })),
      "leads"
    );

  return (
    <div
      ref={containerRef}
      style={{
        fontFamily: appTokens.font,
        // Fills the page content area's real height instead of guessing at
        // it with a vh value - the split-view card below sizes itself off
        // this with flex:1 rather than a fixed 75vh, which is what caused
        // two scrollbars: 75vh plus the header/toolbar above it often added
        // up to more than the actual viewport, so the outer page scrolled
        // *and* the detail pane scrolled internally. Left unset on mobile,
        // which is a normal single-column page that's meant to scroll as a
        // whole, not a fixed-height split view.
        ...(isMobile ? {} : { height: "100%", display: "flex", flexDirection: "column" }),
      }}
    >
      {/* Mobile only - a real, narrow single column already wraps this
          however many times it needs to regardless of how it's grouped, so
          it keeps the one simple combined row. Desktop gets a different,
          deliberate split (see the list rail below): shrinking this to just
          its first few chips, moving the rest + these buttons down into the
          rail's own column, is what lets the detail pane on the right start
          a full row higher instead of waiting for this to clear first. */}
      {isMobile && !showDetailOnMobile && (
        <div style={{ display: "flex", justifyContent: "flex-start", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
          <LeadFilterBar value={quickFilter} onChange={setQuickFilter} counts={counts} />
          <div style={{ width: 1, height: 22, background: appTokens.border, flexShrink: 0 }} />
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {hasPermission("leads.export") && (
              <Button style={{ paddingInline: 10 }} onClick={handleExportLeads}>
                Export
              </Button>
            )}
            <Button style={{ paddingInline: 10 }} onClick={() => setImportOpen(true)}>
              Import
            </Button>
            {hasPermission("leads.create") && (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                style={{ paddingInline: 12 }}
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

      {!showDetailOnMobile && <LeadFilterToolbar activeFilterTags={activeFilterTags} />}

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
                advancedFilters={advancedFilters}
                onAdvancedFiltersChange={setAdvancedFilters}
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
                  initialTab={selectedLead.id === deepLinkedLead?.id ? deepLinkedTab : undefined}
                  onLeadUpdated={() => load(1, false)}
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
            flex: 1,
            minHeight: 0,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: railCollapsed ? 44 : 420,
              flexShrink: 0,
              borderRight: `1px solid ${appTokens.borderLight}`,
              height: "100%",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* The quick filters + Export/Import/+New lead, scoped to this
                column's own width instead of the full page - this is what
                lets the detail pane on the right start flush at the top of
                the shared box instead of waiting for a full-width row to
                clear above it first. The filters themselves use the "list"
                layout (a compact facet list: dot + label + count, no pill
                border) rather than stretched chip-pills - stretching a
                small toggle like "Unassigned" to fill half this narrow
                column read as bloated, and made filters look like the same
                kind of control as the real action buttons below them. A
                plain vertical list is both more information-dense and a
                clearer visual break from those buttons. New lead - the one
                genuinely primary action here - gets its own full-width row
                rather than sharing one with Export/Import, so it reads as a
                deliberate "finishing" button. Hidden alongside the rest of
                this column's own content when collapsed, same as the
                search bar below. */}
            {!railCollapsed && (
              <div style={{ padding: "14px 20px 0", display: "flex", flexDirection: "column", gap: 10, flexShrink: 0 }}>
                {/* Collapsed to one compact row by default - showing all 6 as
                    an always-open list pushed the actual lead rows below the
                    fold, so only 1-2 were visible without scrolling first.
                    Clicking this trigger opens the exact same list (still
                    "list" layout, same component) in a popover instead - same
                    options, same counts, one click away, but costs nothing
                    in the common case of not actively switching filters. */}
                <Popover
                  open={quickFilterOpen}
                  onOpenChange={setQuickFilterOpen}
                  trigger="click"
                  placement="bottomLeft"
                  overlayInnerStyle={{ padding: 6, width: 220 }}
                  content={
                    <LeadFilterBar
                      value={quickFilter}
                      onChange={(v) => {
                        setQuickFilter(v);
                        setQuickFilterOpen(false);
                      }}
                      counts={counts}
                      layout="list"
                    />
                  }
                >
                  <button
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      width: "100%",
                      padding: "7px 10px",
                      borderRadius: appTokens.radiusSm,
                      border: `1px solid ${appTokens.border}`,
                      background: appTokens.surface,
                      cursor: "pointer",
                      textAlign: "left",
                      fontFamily: appTokens.font,
                      boxShadow: appTokens.shadowXs,
                    }}
                  >
                    <span style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                      {(() => {
                        const activeFilter = QUICK_FILTERS.find((f) => f.key === quickFilter) ?? QUICK_FILTERS[0];
                        return (
                          <>
                            <span
                              style={{
                                width: 6,
                                height: 6,
                                borderRadius: "50%",
                                background: activeFilter.dotColor ?? appTokens.border,
                                display: "inline-block",
                                flexShrink: 0,
                              }}
                            />
                            <Text strong style={{ fontSize: 13 }}>
                              {activeFilter.label}
                            </Text>
                            {counts && (
                              <Text style={{ fontSize: 11, fontWeight: 700, color: appTokens.textTertiary }}>
                                {activeFilter.count(counts)}
                              </Text>
                            )}
                          </>
                        );
                      })()}
                    </span>
                    <DownOutlined style={{ fontSize: 10, color: appTokens.textTertiary }} />
                  </button>
                </Popover>
                <div style={{ height: 1, background: appTokens.borderLight, margin: "2px 0" }} />
                <div style={{ display: "flex", gap: 8 }}>
                  {hasPermission("leads.export") && (
                    <Button style={{ flex: 1 }} onClick={handleExportLeads}>
                      Export
                    </Button>
                  )}
                  <Button style={{ flex: 1 }} onClick={() => setImportOpen(true)}>
                    Import
                  </Button>
                </div>
                {hasPermission("leads.create") && (
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    block
                    onClick={() => {
                      setEditingLead(null);
                      setDrawerOpen(true);
                    }}
                  >
                    New lead
                  </Button>
                )}
              </div>
            )}
            <div style={{ flex: 1, minHeight: 0 }}>
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
                advancedFilters={advancedFilters}
                onAdvancedFiltersChange={setAdvancedFilters}
              />
            </div>
          </div>

          <div style={{ flex: 1, minWidth: 0, padding: 20, overflowY: "auto" }}>
            {selectedLead ? (
              // Capped, not flex-stretched - on a wide monitor the detail
              // pane would otherwise keep expanding indefinitely while the
              // list rail stays a fixed width, which is exactly what read as
              // "the list is too small and the detail is too big." But that
              // reasoning only holds while the rail really is a fixed width -
              // once the user collapses it themselves (down to 44px,
              // deliberately trading the list for more detail room), keeping
              // this cap just leaves a large dead strip of blank page to the
              // right instead (confirmed: up to ~480px wasted at 1600px wide,
              // ~160px at a real 1280px screen, worse still once the app's
              // own sidebar is also collapsed) - exactly the opposite of what
              // collapsing was for. So the cap only applies while the rail is
              // still taking its normal fixed width.
              <div style={{ maxWidth: railCollapsed ? undefined : 960 }}>
                <LeadDetail
                  lead={selectedLead}
                  showOwner={showOwner}
                  onEdit={() => {
                    setEditingLead(selectedLead);
                    setDrawerOpen(true);
                  }}
                  initialTab={selectedLead.id === deepLinkedLead?.id ? deepLinkedTab : undefined}
                  onLeadUpdated={() => load(1, false)}
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
      <ImportLeadsModal open={importOpen} onClose={() => setImportOpen(false)} onImported={() => load(1, false)} />
    </div>
  );
}
