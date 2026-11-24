import type { SwapCandidate } from "../../api/lead-api";
import { appTokens } from "../../utils/design-system";

// One look for "pick a person" lists (Send to Field Sales, Reassign): the
// full name on top, email and operation type (COCO / FOFO / Both) below -
// searchable by either name or email.
export function candidateOptions(candidates: SwapCandidate[]) {
  return candidates.map((c) => ({ value: c.id, label: c.name, searchText: `${c.name} ${c.email}`, candidate: c }));
}

export function renderCandidateOption(option: { data: { candidate?: SwapCandidate } }) {
  const c = option.data.candidate;
  if (!c) return null;
  return (
    <div style={{ lineHeight: 1.3, padding: "2px 0" }}>
      <div style={{ fontWeight: 500, whiteSpace: "normal" }}>{c.name}</div>
      <div style={{ fontSize: 12, color: appTokens.textTertiary, whiteSpace: "normal", wordBreak: "break-all" }}>
        {c.email}
        {c.operationType ? ` · ${c.operationType}` : ""}
      </div>
    </div>
  );
}
