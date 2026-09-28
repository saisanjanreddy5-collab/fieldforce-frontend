import dayjs from "dayjs";
import type { LeaveBalance, LeaveRequestKind } from "../types/leave";
import { appTokens } from "./design-system";

const SPECIAL_KIND_LABEL: Record<string, string> = { half_day: "Half day", wfh: "Work from home" };

export function kindLabel(kind: LeaveRequestKind, balances: LeaveBalance[]): string {
  return SPECIAL_KIND_LABEL[kind] ?? balances.find((b) => b.key === kind)?.label ?? kind;
}

export function kindColor(kind: LeaveRequestKind, balances: LeaveBalance[]): string {
  return balances.find((b) => b.key === kind)?.color ?? appTokens.textTertiary;
}

export function formatDateRange(startDate: string, endDate: string): string {
  const start = dayjs(startDate);
  const end = dayjs(endDate);
  return start.isSame(end, "day") ? start.format("D MMM") : `${start.format("D MMM")} - ${end.format("D MMM")}`;
}

export function daysLabel(daysCount: number): string {
  return daysCount === 0.5 ? "Half day" : `${daysCount} day${daysCount === 1 ? "" : "s"}`;
}
