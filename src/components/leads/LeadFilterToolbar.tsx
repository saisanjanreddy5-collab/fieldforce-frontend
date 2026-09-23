import { Typography } from "antd";
import type { LeadQuickFilterCounts } from "../../api/lead-api";
import { appTokens } from "../../utils/design-system";
import { LeadFilterBar, type QuickFilterKey } from "./LeadFilterBar";
import { LeadFilters, type AdvancedFilters } from "./LeadFilters";

const { Text } = Typography;

interface FilterTag {
  key: string;
  label: string;
  onRemove: () => void;
}

interface LeadFilterToolbarProps {
  quickFilter: QuickFilterKey;
  onQuickFilterChange: (value: QuickFilterKey) => void;
  advancedFilters: AdvancedFilters;
  onAdvancedFiltersChange: (value: AdvancedFilters) => void;
  activeFilterTags: FilterTag[];
  counts: LeadQuickFilterCounts | null;
  total: number;
  loading: boolean;
}

// Full-width, above the list/detail split - not squeezed into the narrow
// list rail. The rail is ~340px, nowhere near enough room for 4 chips + a
// Filters button + a result count on one line; this bar gets the page's
// full content width instead, which is what actually fixes the cramped,
// mid-word-clipped look rather than just restyling within the same box.
export function LeadFilterToolbar({
  quickFilter,
  onQuickFilterChange,
  advancedFilters,
  onAdvancedFiltersChange,
  activeFilterTags,
  counts,
  total,
  loading,
}: LeadFilterToolbarProps) {
  return (
    <div
      style={{
        background: appTokens.surface,
        border: `1px solid ${appTokens.border}`,
        borderRadius: appTokens.radius,
        padding: "12px 16px",
        marginBottom: 20,
        boxShadow: appTokens.shadowXs,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <LeadFilterBar value={quickFilter} onChange={onQuickFilterChange} counts={counts} />
        <div style={{ display: "flex", alignItems: "center", gap: 16, flexShrink: 0 }}>
          <Text style={{ fontSize: 12.5, whiteSpace: "nowrap", color: appTokens.textTertiary, fontWeight: 500 }}>
            {loading ? "Loading…" : `${total} lead${total === 1 ? "" : "s"} shown`}
          </Text>
          <LeadFilters value={advancedFilters} onChange={onAdvancedFiltersChange} />
        </div>
      </div>

      {activeFilterTags.length > 0 && (
        <div
          style={{
            display: "flex",
            gap: 6,
            flexWrap: "wrap",
            marginTop: 12,
            paddingTop: 12,
            borderTop: `1px solid ${appTokens.borderLight}`,
          }}
        >
          {activeFilterTags.map((tag) => (
            <span
              key={tag.key}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                fontSize: 12,
                fontWeight: 500,
                background: appTokens.primarySoft,
                color: appTokens.primary,
                border: `1px solid ${appTokens.primarySoftBorder}`,
                borderRadius: 999,
                padding: "4px 8px 4px 10px",
              }}
            >
              {tag.label}
              <span
                style={{
                  cursor: "pointer",
                  fontWeight: 600,
                  width: 14,
                  height: 14,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "50%",
                }}
                onClick={tag.onRemove}
              >
                ×
              </span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
