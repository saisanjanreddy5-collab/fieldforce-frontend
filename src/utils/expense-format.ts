import dayjs from "dayjs";
import type { ExpenseType } from "../types/expense";

const UNIT_SUFFIX: Record<ExpenseType["limitUnit"], string> = {
  trip: "/ trip",
  km: "/ km",
  night: "/ night",
  day: "/ day",
  meeting: "/ meeting",
  month: "/ month",
};

export function limitUnitSuffix(unit: ExpenseType["limitUnit"]): string {
  return UNIT_SUFFIX[unit];
}

export function formatExpenseDate(date: string): string {
  return dayjs(date).format("D MMM");
}
