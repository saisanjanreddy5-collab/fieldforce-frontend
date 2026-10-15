import { appTokens } from "../../utils/design-system";

interface FilterTag {
  key: string;
  label: string;
  onRemove: () => void;
}

interface LeadFilterToolbarProps {
  activeFilterTags: FilterTag[];
}

// Quick-filter chips now live in the page header row, and the Filters
// button next to the list's own search box - this bar's only job left is
// the removable "active filter" tag overflow, shown only when there's
// something to show (an advanced filter actually applied), so there's never
// an empty bordered box sitting here with nothing in it.
export function LeadFilterToolbar({ activeFilterTags }: LeadFilterToolbarProps) {
  if (activeFilterTags.length === 0) return null;

  return (
    <div
      style={{
        display: "flex",
        gap: 6,
        flexWrap: "wrap",
        background: appTokens.surface,
        border: `1px solid ${appTokens.border}`,
        borderRadius: appTokens.radius,
        padding: "10px 16px",
        marginBottom: 20,
        boxShadow: appTokens.shadowXs,
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
  );
}
