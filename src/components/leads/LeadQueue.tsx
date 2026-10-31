import { useEffect, useRef, useState } from "react";
import { Button, Empty, Input, Spin, Typography } from "antd";
import { DoubleLeftOutlined, DoubleRightOutlined, SearchOutlined } from "@ant-design/icons";
import { FixedSizeList, type ListOnItemsRenderedProps } from "react-window";
import type { Lead } from "../../types/lead";
import { appTokens } from "../../utils/design-system";
import { LeadRow } from "./LeadRow";
import { LeadFilters, type AdvancedFilters } from "./LeadFilters";

const { Text } = Typography;

// LeadRow is a fixed two-line layout (no variable-height content - every
// field truncates with ellipsis rather than wrapping), so a plain
// FixedSizeList works here without needing react-window's variable-size
// variant. Measured against the row's own padding (10px top/bottom) plus its
// two text lines - matches closely enough that react-window's own
// overscan/off-by-a-few-px tolerance handles the rest.
const ROW_HEIGHT = 68;
// How many rows from the end of what's currently loaded before fetching the
// next page - small enough to not over-fetch, large enough that scrolling
// fast never outruns the network round-trip and shows a visible gap.
const LOAD_MORE_THRESHOLD = 8;

interface LeadQueueProps {
  leads: Lead[];
  total: number;
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
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

// The narrow list rail: search + Filters + collapse control, then the row
// list itself. Quick filters and active-filter tags live in the full-width
// header/toolbar above the list/detail split instead - this column is too
// narrow for those. No border of its own - the caller (LeadsPage) wraps
// this and LeadDetail in one shared card with a single internal divider,
// instead of two separate floating boxes with a gap between them.
export function LeadQueue({
  leads,
  total,
  loading,
  loadingMore,
  hasMore,
  onLoadMore,
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
  // react-window needs an explicit pixel height, not "flex: 1" - measured via
  // ResizeObserver so the list fills whatever space the surrounding layout
  // (sidebar collapse, window resize, filter bar height) actually gives it.
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      setContainerHeight(entries[0].contentRect.height);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const handleItemsRendered = ({ visibleStopIndex }: ListOnItemsRenderedProps) => {
    if (!loadingMore && hasMore && visibleStopIndex >= leads.length - LOAD_MORE_THRESHOLD) {
      onLoadMore();
    }
  };

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

      <div ref={containerRef} style={{ flex: 1, minHeight: 200, margin: "0 -20px" }}>
        {loading ? (
          <div style={{ padding: 24, textAlign: "center" }}>
            <Spin />
          </div>
        ) : leads.length === 0 ? (
          <Empty description="No leads match this filter" style={{ padding: 24 }} />
        ) : containerHeight > 0 ? (
          <FixedSizeList
            height={containerHeight}
            width="100%"
            itemCount={leads.length + (loadingMore ? 1 : 0)}
            itemSize={ROW_HEIGHT}
            onItemsRendered={handleItemsRendered}
          >
            {({ index, style }) =>
              index >= leads.length ? (
                <div style={{ ...style, textAlign: "center", paddingTop: 12 }}>
                  <Spin size="small" />
                </div>
              ) : (
                <div style={style}>
                  <LeadRow
                    lead={leads[index]}
                    selected={leads[index].id === selectedId}
                    showOwner={showOwner}
                    onClick={() => onSelect(leads[index].id)}
                  />
                </div>
              )
            }
          </FixedSizeList>
        ) : null}
      </div>
    </div>
  );
}
