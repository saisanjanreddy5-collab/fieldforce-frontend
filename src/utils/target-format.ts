import dayjs from "dayjs";
import type { PeriodType, Target } from "../types/target";

// annual > quarterly > monthly when more than one target is simultaneously
// active for the same person - a reasonable default for a single summary
// column; a drawer or detail view can always show the full list.
const PERIOD_PRIORITY: Record<PeriodType, number> = { annual: 0, quarterly: 1, monthly: 2 };

export function resolveCurrentTarget(userId: string, targets: Target[]): Target | undefined {
  const today = dayjs().format("YYYY-MM-DD");
  const active = targets.filter((t) => t.userId === userId && t.periodStart <= today && t.periodEnd >= today);
  return active.sort((a, b) => PERIOD_PRIORITY[a.periodType] - PERIOD_PRIORITY[b.periodType])[0];
}
