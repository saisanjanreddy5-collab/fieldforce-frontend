import dayjs, { type Dayjs } from "dayjs";
import type { CalendarDayTag } from "../types/calendar";

export function dateKey(d: Dayjs): string {
  return d.format("YYYY-MM-DD");
}

export function startOfWeekMonday(d: Dayjs): Dayjs {
  // dayjs' default week start is locale-dependent (Sunday in the default
  // locale) - the reference's week grid always runs Mon-Sun, so this pins
  // it regardless of the browser's locale.
  const day = d.day();
  const diff = day === 0 ? -6 : 1 - day;
  return d.add(diff, "day").startOf("day");
}

export const DAY_TAG_LABEL: Record<CalendarDayTag, string> = {
  field: "Field",
  office: "Office",
  off: "Off",
};

export const DAY_TAG_COLOR: Record<CalendarDayTag, string> = {
  field: "#dc8a00",
  office: "#4b5565",
  off: "#9aa2b1",
};

export function relativeSyncLabel(isoTimestamp: string | null): string {
  if (!isoTimestamp) return "Microsoft 365 not connected";
  const minutes = dayjs().diff(dayjs(isoTimestamp), "minute");
  if (minutes < 1) return "Synced just now";
  if (minutes < 60) return `Synced ${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Synced ${hours}h ago`;
  return `Synced ${dayjs(isoTimestamp).format("D MMM")}`;
}
