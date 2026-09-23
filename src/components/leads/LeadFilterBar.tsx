import type { LeadQuickFilterCounts } from "../../api/lead-api";
import { appTokens } from "../../utils/design-system";

export type QuickFilterKey = "all" | "myLeads" | "unassigned" | "overdue" | "fofo" | "highScore";

interface QuickFilterDef {
  key: QuickFilterKey;
  label: string;
  dotColor: string | null;
  count: (counts: LeadQuickFilterCounts) => number;
}

const QUICK_FILTERS: QuickFilterDef[] = [
  { key: "all", label: "All leads", dotColor: null, count: (c) => c.all },
  { key: "myLeads", label: "My leads", dotColor: appTokens.primary, count: (c) => c.myLeads },
  { key: "unassigned", label: "Unassigned", dotColor: appTokens.textTertiary, count: (c) => c.unassigned },
  { key: "overdue", label: "Overdue", dotColor: appTokens.danger, count: (c) => c.overdue },
  { key: "fofo", label: "FOFO", dotColor: appTokens.purple, count: (c) => c.fofo },
  { key: "highScore", label: "High score", dotColor: appTokens.success, count: (c) => c.highScore },
];

interface LeadFilterBarProps {
  value: QuickFilterKey;
  onChange: (value: QuickFilterKey) => void;
  counts: LeadQuickFilterCounts | null;
}

// Single-select, like a segmented control - only one bucket can be active
// at a time. These buckets aren't independent, orthogonal properties you'd
// ever want to AND together (e.g. "My leads" means owner = me, "Unassigned"
// means owner = null - selecting both simultaneously as independent
// toggles could only ever produce zero results). Every chip still shows
// its own live count regardless of which one is currently selected, same
// as a normal tab bar with badges.
export function LeadFilterBar({ value, onChange, counts }: LeadFilterBarProps) {
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {QUICK_FILTERS.map((filter) => {
        const active = value === filter.key;
        return (
          <button
            key={filter.key}
            onClick={() => onChange(filter.key)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "7px 14px",
              fontSize: 13,
              fontFamily: appTokens.font,
              fontWeight: active ? 600 : 500,
              borderRadius: 999,
              border: active ? `1px solid ${appTokens.primary}` : `1px solid ${appTokens.border}`,
              background: active ? appTokens.primary : appTokens.surface,
              color: active ? "#fff" : appTokens.textPrimary,
              cursor: "pointer",
              whiteSpace: "nowrap",
              boxShadow: active ? "0 2px 6px rgba(19,84,224,0.28)" : appTokens.shadowXs,
              transition: "background 0.12s, border-color 0.12s, box-shadow 0.12s",
            }}
          >
            {filter.dotColor && (
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: active ? "#fff" : filter.dotColor,
                  display: "inline-block",
                  flexShrink: 0,
                }}
              />
            )}
            {filter.label}
            {counts && <CountBadge active={active}>{filter.count(counts)}</CountBadge>}
          </button>
        );
      })}
    </div>
  );
}

function CountBadge({ active, children }: { active: boolean; children: number }) {
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 700,
        minWidth: 16,
        textAlign: "center",
        padding: "0 5px",
        borderRadius: 999,
        background: active ? "rgba(255,255,255,0.25)" : appTokens.surfaceMuted,
        color: active ? "#fff" : appTokens.textTertiary,
      }}
    >
      {children}
    </span>
  );
}
