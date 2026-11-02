import type { ReactNode } from "react";
import { ArrowRightOutlined } from "@ant-design/icons";
import { appTokens } from "../../utils/design-system";

// Wraps the ONE primary "move this lead forward" button with a connecting
// arrow, shared by every stage's own next-step component (CallCenterStageActions'
// Start FLC/Escalate to SLC/Mark Qualified, LeadAssignmentPanel's Send to
// Field Sales) so they all read identically next to the status tag, instead
// of each one styling its own arrow slightly differently.
export function NextStepSlot({ children }: { children: ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <ArrowRightOutlined style={{ fontSize: 11, color: appTokens.textTertiary }} />
      {children}
    </div>
  );
}
