import type { Level } from "../types/level";
import { formatCompactCurrency } from "./lead-format";

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
