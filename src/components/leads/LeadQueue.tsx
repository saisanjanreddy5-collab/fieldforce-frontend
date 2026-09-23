import type { UIEvent } from "react";
import { Button, Empty, Input, Spin, Typography } from "antd";
import { DoubleLeftOutlined, DoubleRightOutlined, SearchOutlined } from "@ant-design/icons";
import type { Lead } from "../../types/lead";
import { appTokens } from "../../utils/design-system";
import { LeadRow } from "./LeadRow";

const { Text } = Typography;

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
}

// The narrow list rail: search + collapse control, then the row list
// itself. Quick filters, the Filters popover, active-filter tags and the
// result count all live in the full-width LeadFilterToolbar above the
// list/detail split instead - this column is too narrow for them. No border
// of its own - the caller (LeadsPage) wraps this and LeadDetail in one
// shared card with a single internal divider, instead of two separate
// floating boxes with a gap between them.
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
}: LeadQueueProps) {
  const handleScroll = (e: UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (!loadingMore && hasMore && el.scrollTop + el.clientHeight >= el.scrollHeight - 80) {
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
        />
        <Button icon={<DoubleLeftOutlined />} onClick={onToggleCollapsed} title="Collapse list" />
      </div>

      <div onScroll={handleScroll} style={{ flex: 1, overflowY: "auto", minHeight: 200, margin: "0 -20px" }}>
        {loading ? (
          <div style={{ padding: 24, textAlign: "center" }}>
            <Spin />
          </div>
        ) : leads.length === 0 ? (
          <Empty description="No leads match this filter" style={{ padding: 24 }} />
        ) : (
          <>
            {leads.map((lead) => (
              <LeadRow key={lead.id} lead={lead} selected={lead.id === selectedId} showOwner={showOwner} onClick={() => onSelect(lead.id)} />
            ))}
            {loadingMore && (
              <div style={{ padding: 12, textAlign: "center" }}>
                <Spin size="small" />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
