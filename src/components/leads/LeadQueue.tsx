import { Button, Empty, Input, Skeleton, Typography } from "antd";
import { DoubleLeftOutlined, DoubleRightOutlined, SearchOutlined } from "@ant-design/icons";
import type { Lead } from "../../types/lead";
import { appTokens } from "../../utils/design-system";
import { LeadRow } from "./LeadRow";
import { LeadFilters, type AdvancedFilters } from "./LeadFilters";
import { ListPagination } from "../ListPagination";

const { Text } = Typography;

interface LeadQueueProps {
  leads: Lead[];
  total: number;
  loading: boolean;
  page: number;
  pageSize: number;
  onPageChange: (page: number, pageSize: number) => void;
  selectedId: string | null;
  onSelect: (id: string) => void;
  showOwner: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  advancedFilters: AdvancedFilters;
  onAdvancedFiltersChange: (value: AdvancedFilters) => void;
  /** Phone-width single-column list: tighter padding, rows run edge to edge
   * of the card (the 20px gutter on both card and rows indented every row
   * ~40px from the screen edge), and no collapse button - there's no
   * side-by-side detail pane to collapse the list in favour of. */
  compact?: boolean;
}

// The narrow list rail: search + Filters + collapse control, the row list
// itself, then a real numbered pager - replaces the previous infinite-scroll
// + react-window setup. Client-confirmed: numbered pages (matching every
// other list in the app - Opportunities, Call Center, People) over endless
// scroll, since this is a working tool people jump around in (search, flip
// back a page, return to where they were), not a feed to browse. Each page
// only ever holds `pageSize` rows, so a plain list needs no virtualization -
// that was only ever there to cope with an unbounded, ever-growing list.
// Quick filters and active-filter tags live in the full-width header/toolbar
// above the list/detail split instead - this column is too narrow for
// those. No border of its own - the caller (LeadsPage) wraps this and
// LeadDetail in one shared card with a single internal divider, instead of
// two separate floating boxes with a gap between them.
export function LeadQueue({
  leads,
  total,
  loading,
  page,
  pageSize,
  onPageChange,
  selectedId,
  onSelect,
  showOwner,
  search,
  onSearchChange,
  collapsed,
  onToggleCollapsed,
  advancedFilters,
  onAdvancedFiltersChange,
  compact = false,
}: LeadQueueProps) {
  const padding = compact ? 12 : 20;
  if (collapsed) {
    return (
      <div style={{ width: 44, flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 12 }}>
        <Button size="small" icon={<DoubleRightOutlined />} onClick={onToggleCollapsed} title="Expand list" />
        <Text style={{ fontSize: 11, writingMode: "vertical-rl", marginTop: 12, fontWeight: 600, color: appTokens.textTertiary }}>
          {total} leads
        </Text>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", padding }}>
      <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
        <Input
          placeholder="Search name, company, phone"
          prefix={<SearchOutlined style={{ color: appTokens.textTertiary }} />}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          allowClear
          style={{ flex: 1, minWidth: 0 }}
        />
        <LeadFilters value={advancedFilters} onChange={onAdvancedFiltersChange} />
        {!compact && <Button icon={<DoubleLeftOutlined />} onClick={onToggleCollapsed} title="Collapse list" />}
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", margin: `0 -${padding}px`, padding: compact ? 0 : `0 ${padding}px` }}>
        {/* First load: placeholder rows in the list's own shape. Later
            reloads (filter, search, page) keep the current rows on screen,
            slightly dimmed, until the new ones arrive - no blank flash. */}
        {loading && leads.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 18, padding: compact ? "12px" : "12px 0" }}>
            {Array.from({ length: 8 }, (_, i) => (
              <Skeleton key={i} active avatar={{ shape: "square", size: 32 }} title={{ width: "60%" }} paragraph={{ rows: 1, width: "40%" }} />
            ))}
          </div>
        ) : leads.length === 0 ? (
          <Empty description="No leads match this filter" style={{ padding: 24 }} />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", opacity: loading ? 0.55 : 1, transition: "opacity 0.15s", transitionDelay: loading ? "0.2s" : "0s" }}>
            {leads.map((lead) => (
              <LeadRow key={lead.id} lead={lead} selected={lead.id === selectedId} showOwner={showOwner} onClick={() => onSelect(lead.id)} />
            ))}
          </div>
        )}
      </div>

      {total > 0 && (
        <div style={{ paddingTop: 12, flexShrink: 0, width: "100%" }}>
          <ListPagination page={page} pageSize={pageSize} total={total} onChange={onPageChange} compact />
        </div>
      )}
    </div>
  );
}
