import type { Level, RecordScope } from "../types/level";
import { formatCompactCurrency } from "./lead-format";

export const RECORD_SCOPE_OPTIONS: { value: RecordScope; label: string; description: string }[] = [
  { value: "own_only", label: "Own records only", description: "No team visibility" },
  { value: "own_and_below", label: "Own + everyone below", description: "Default - follows the reporting tree" },
  { value: "own_below_peers_readonly", label: "Own + below + peers read-only", description: "Peers become readable, not editable" },
  { value: "whole_region", label: "Whole region", description: "Every record in the region, any owner" },
  { value: "everything", label: "Everything", description: "No row filter at all" },
];

// Derived, not stored - "Whole tree" vs "Own + below" is the same
// own_and_below scope, just worded differently depending on whether this
// level sits at the very top of the ladder (nothing above it, so "own +
// everyone below" already covers the whole org).
export function seesLabel(level: Level, isTopOfLadder: boolean): string {
  if (level.seesLabelOverride) return level.seesLabelOverride;
  switch (level.recordScope) {
    case "everything":
      return "Everything";
    case "whole_region":
      return "Whole region";
    case "own_below_peers_readonly":
      return "Own + below + peers";
    case "own_and_below":
      return isTopOfLadder ? "Whole tree" : "Own + everyone below";
    case "own_only":
    default:
      return "Own only";
  }
}

export function peersLabel(level: Level): string {
  switch (level.recordScope) {
    case "own_only":
      return "Hidden";
    case "own_and_below":
      return "Aggregates";
    default:
      return "Full";
  }
}

export function approvesUpToLabel(level: Level): string {
  if (level.approvalLabelOverride) return level.approvalLabelOverride;
  return level.approvalCeiling === null ? "Unlimited" : formatCompactCurrency(level.approvalCeiling);
}

export function headcountLabel(level: Level): string {
  if (level.headcountLimit === null) return String(level.currentHeadcount);
  const open = level.headcountLimit - level.currentHeadcount;
  return open > 0 ? `${level.currentHeadcount}+${open}` : String(level.currentHeadcount);
}

// Same "L1"..."L6" numbering the Levels & axes ladder uses - cross-cutting
// levels (Administrator, Finance) aren't part of that ladder, so they're L0.
export function ladderIndex(level: Level, levels: Level[]): number {
  if (level.isCrossCutting) return 0;
  const ladder = levels.filter((l) => !l.isCrossCutting).sort((a, b) => a.sortOrder - b.sortOrder);
  const position = ladder.findIndex((l) => l.id === level.id);
  return position === -1 ? 0 : position + 1;
}
