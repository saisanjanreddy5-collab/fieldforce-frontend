import { Button, Empty, Input, Pagination, Spin, Typography } from "antd";
import { DoubleLeftOutlined, DoubleRightOutlined, SearchOutlined } from "@ant-design/icons";
import type { Lead } from "../../types/lead";
import { appTokens } from "../../utils/design-system";
import { LeadRow } from "./LeadRow";
import { LeadFilters, type AdvancedFilters } from "./LeadFilters";

const { Text } = Typography;

interface LeadQueueProps {
  leads: Lead[];
  total: number;
  loading: boolean;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  selectedId: string | null;
  onSelect: (id: string) => void;
  showOwner: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  advancedFilters: AdvancedFilters;
  onAdvancedFiltersChange: (value: AdvancedFilters) => void;
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
}: LeadQueueProps) {
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
    <div style={{ display: "flex", flexDirection: "column", height: "100%", padding: 20 }}>
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
        <Button icon={<DoubleLeftOutlined />} onClick={onToggleCollapsed} title="Collapse list" />
      </div>

      <div style={{ flex: 1, minHeight: 200, overflowY: "auto", margin: "0 -20px", padding: "0 20px" }}>
        {loading ? (
          <div style={{ padding: 24, textAlign: "center" }}>
            <Spin />
          </div>
        ) : leads.length === 0 ? (
          <Empty description="No leads match this filter" style={{ padding: 24 }} />
        ) : (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {leads.map((lead) => (
              <LeadRow key={lead.id} lead={lead} selected={lead.id === selectedId} showOwner={showOwner} onClick={() => onSelect(lead.id)} />
            ))}
          </div>
        )}
      </div>

      {!loading && total > pageSize && (
        <div style={{ display: "flex", justifyContent: "center", paddingTop: 12, flexShrink: 0 }}>
          <Pagination size="small" current={page} pageSize={pageSize} total={total} onChange={onPageChange} showSizeChanger={false} />
        </div>
      )}
    </div>
  );
}
