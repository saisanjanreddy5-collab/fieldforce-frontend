import dayjs from "dayjs";
import { appTokens } from "./design-system";

// Measured against white: the old literal hexes here (bypassing the shared
// design tokens entirely) ranged from borderline to severely failing as
// text color - the 40-69 amber band (#eda100) was only 2.17:1, and the
// null/no-score gray (#c3c2b7) just 1.79:1, against a 4.5:1 floor. Reusing
// the same *Strong tokens the Settings status pills use keeps this one
// real, accessible set of colors instead of a second, uncoordinated one.
export function scoreColor(score: number | null): string {
  if (score === null) return appTokens.textTertiary;
  if (score >= 70) return appTokens.successStrong;
  if (score >= 40) return appTokens.warningStrong;
  return appTokens.danger;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function formatDurationSeconds(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.round(totalSeconds % 60);
  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
}

export function formatCompactCurrency(value: number | null): string {
  if (value === null) return "-";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

// The full, comma-grouped figure (₹4,284) rather than the compact one
// (₹4.3K) - used for a single row's exact amount, where compact notation
// reads as imprecise. Compact stays for aggregates (stat cards, totals)
// where the precise figure would be too long to scan at a glance.
export function formatCurrency(value: number | null): string {
  if (value === null) return "-";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDateTime(value: string | null): string {
  if (!value) return "-";
  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatDate(value: string | null): string {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

// Compact "next follow-up" label for a lead row: today's due activities show
// their time, tomorrow's just say "Tomorrow", overdue ones say how overdue,
// anything further out shows a short date - matching how a follow-up queue
// is normally scanned at a glance.
export function formatFollowUpDate(value: string | null | undefined): { label: string; overdue: boolean } | null {
  if (!value) return null;
  const due = dayjs(value);
  const now = dayjs();
  if (due.isBefore(now)) {
    const days = now.startOf("day").diff(due.startOf("day"), "day");
    return { label: days <= 0 ? "Overdue today" : `${days} day${days === 1 ? "" : "s"} overdue`, overdue: true };
  }
  if (due.isSame(now, "day")) return { label: `Today ${due.format("h:mm A")}`, overdue: false };
  if (due.isSame(now.add(1, "day"), "day")) return { label: "Tomorrow", overdue: false };
  return { label: due.format("D MMM"), overdue: false };
}
