import { Tag, Tooltip } from "antd";
import { appTokens } from "../../utils/design-system";
import type { Lead } from "../../types/lead";

// Shown wherever a lead with duplicateOfLeadId set is listed or opened
// (Leads list, Lead Detail header, Call Center queue rows) - same visual
// language as the other status Tags in this app, just in the warning color.
export function DuplicateLeadTag({
  lead,
  compact = false,
}: {
  lead: Pick<Lead, "duplicateOfLeadId" | "duplicateOfFullName" | "duplicateOfLeadNumber">;
  /** Matches LeadRow's smaller 10px list-row tags instead of LeadSnapshot's full-size header tags. */
  compact?: boolean;
}) {
  if (!lead.duplicateOfLeadId) return null;

  const label = lead.duplicateOfLeadNumber ? `#${lead.duplicateOfLeadNumber} - ${lead.duplicateOfFullName ?? "another lead"}` : lead.duplicateOfFullName ?? "another lead";

  return (
    <Tooltip title={`Same phone number as ${label}`}>
      <Tag
        style={{
          margin: 0,
          flexShrink: 0,
          fontSize: compact ? 10 : 11.5,
          fontWeight: 600,
          lineHeight: compact ? "16px" : undefined,
          padding: compact ? "0 6px" : "2px 8px",
          background: `${appTokens.warning}17`,
          color: appTokens.warning,
          border: "none",
        }}
      >
        Possible duplicate
      </Tag>
    </Tooltip>
  );
}
