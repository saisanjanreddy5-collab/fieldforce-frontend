import { Button } from "antd";
import { FilterOutlined } from "@ant-design/icons";

export interface FilterTabDef {
  key: string;
  label: string;
  count: number;
  dotColor?: string;
}

interface LeadFilterBarProps {
  tabs: FilterTabDef[];
  activeTab: string;
  onTabChange: (key: string) => void;
  totalCount: number;
  shownCount: number;
  filtersOpen: boolean;
  onToggleFilters: () => void;
}

// Spans the FULL page width (above both the list and detail columns) -
// not confined to the narrow list sidebar, which is what made this cramped
// before.
export function LeadFilterBar({
  tabs,
  activeTab,
  onTabChange,
  totalCount,
  shownCount,
  filtersOpen,
  onToggleFilters,
}: LeadFilterBarProps) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <div className="scrollbar-hidden" style={{ display: "flex", gap: 8, overflowX: "auto", flex: 1, minWidth: 0 }}>
        {tabs.map((tab) => {
          const selected = tab.key === activeTab;
          return (
            <button
              key={tab.key}
              onClick={() => onTabChange(tab.key)}
              style={{
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "4px 12px",
                fontSize: 13,
                lineHeight: "20px",
                borderRadius: 999,
                border: selected ? "1px solid #1677ff" : "1px solid #d9d9d9",
                background: selected ? "#1677ff" : "#fff",
                color: selected ? "#fff" : "rgba(0,0,0,0.88)",
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {tab.dotColor && (
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: selected ? "#fff" : tab.dotColor,
                    display: "inline-block",
                    flexShrink: 0,
                  }}
                />
              )}
              {tab.label} {tab.count}
            </button>
          );
        })}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
        <span style={{ fontSize: 13, color: "#898781", whiteSpace: "nowrap" }}>
          {shownCount} of {totalCount} leads shown
        </span>
        <Button size="small" icon={<FilterOutlined />} type={filtersOpen ? "primary" : "default"} onClick={onToggleFilters}>
          Filters
        </Button>
      </div>
    </div>
  );
}
