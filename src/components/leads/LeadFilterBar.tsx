import type { LeadQuickFilterCounts } from "../../api/lead-api";
import { appTokens } from "../../utils/design-system";

export type QuickFilterKey = "all" | "myLeads" | "unassigned" | "overdue" | "fofo" | "highScore";

interface QuickFilterDef {
  key: QuickFilterKey;
  label: string;
  dotColor: string | null;
  count: (counts: LeadQuickFilterCounts) => number;
}

export const QUICK_FILTERS: QuickFilterDef[] = [
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
  /** Renders only this subset, in QUICK_FILTERS' own order - e.g. splitting
   *  the bar across two stacked rows (Leads page's list rail) without
   *  duplicating the chip-rendering/styling logic in two places. Omit for
   *  every chip (the normal case). */
  only?: QuickFilterKey[];
  /** Each chip fills an equal share of the row instead of hugging its own
   *  text width - for a narrow column showing just 2 chips per row, where a
   *  natural-width pair left dead space trailing after it; a full-width
   *  stretched pair reads as a deliberate segmented control instead. Ignored
   *  when layout="list". */
  stretch?: boolean;
  /** "pills" (default): the original chip-row look, used full-width on
   *  mobile and anywhere these sit alongside other pill-shaped controls.
   *  "list": a compact vertical facet list (dot + label + count, no pill
   *  border, a soft highlight on the active row) - the Leads list rail's
   *  own look, since stretching small toggle chips to fill a narrow column
   *  read as bloated and too visually similar to the real action buttons
   *  (Export/Import) sitting right below them. */
  layout?: "pills" | "list";
}

// Single-select, like a segmented control - only one bucket can be active
// at a time. These buckets aren't independent, orthogonal properties you'd
// ever want to AND together (e.g. "My leads" means owner = me, "Unassigned"
// means owner = null - selecting both simultaneously as independent
// toggles could only ever produce zero results). Every chip still shows
// its own live count regardless of which one is currently selected, same
// as a normal tab bar with badges.
export function LeadFilterBar({ value, onChange, counts, only, stretch, layout = "pills" }: LeadFilterBarProps) {
  const filters = only ? QUICK_FILTERS.filter((f) => only.includes(f.key)) : QUICK_FILTERS;

  if (layout === "list") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 2, width: "100%" }}>
        {filters.map((filter) => {
          const active = value === filter.key;
          return (
            <button
              key={filter.key}
              onClick={() => onChange(filter.key)}
              className={active ? undefined : "quick-filter-row"}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                width: "100%",
                padding: "7px 10px",
                borderRadius: appTokens.radiusSm,
                border: "none",
                background: active ? appTokens.primarySoft : "transparent",
                cursor: "pointer",
                textAlign: "left",
                fontFamily: appTokens.font,
                transition: "background 0.12s",
              }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: filter.dotColor ?? appTokens.border,
                    display: "inline-block",
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: active ? 600 : 500,
                    color: active ? appTokens.primary : appTokens.textPrimary,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {filter.label}
                </span>
              </span>
              {counts && <CountBadge active={active}>{filter.count(counts)}</CountBadge>}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", gap: 5, flexWrap: "wrap", width: stretch ? "100%" : undefined }}>
      {filters.map((filter) => {
        const active = value === filter.key;
        return (
          <button
            key={filter.key}
            onClick={() => onChange(filter.key)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: stretch ? "center" : "flex-start",
              flex: stretch ? 1 : undefined,
              gap: 5,
              padding: "5px 10px",
              fontSize: 12.5,
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
        background: active ? appTokens.primary : appTokens.surfaceMuted,
        color: active ? "#fff" : appTokens.textTertiary,
        flexShrink: 0,
      }}
    >
      {children}
    </span>
  );
}
