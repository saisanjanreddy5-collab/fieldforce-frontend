export function formatCompactNumber(value: number): string {
  return new Intl.NumberFormat("en-IN", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

export function formatPercent(value: number): string {
  return `${value}%`;
}

// The job title people actually know each security role by, instead of the
// raw role key ("agent", "call_center") - used wherever a person's role is
// shown as a label and they have no designation of their own set.
const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  manager: "Manager",
  agent: "Field Sales Executive",
  call_center: "Call Center Executive",
};

export function roleLabel(role: string): string {
  return (
    ROLE_LABELS[role] ??
    role
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")
  );
}
