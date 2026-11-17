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

// What the "Approver" field says when the requester has no reporting
// manager - mirrors the backend routing: such a request goes to any Admin;
// only an Admin with no manager AND no other active Admin is auto-approved.
export function noManagerApproverLabel(role: string | undefined): string {
  return role === "admin"
    ? "No reporting manager - another Admin will approve (auto-approved only if you're the sole Admin)"
    : "No reporting manager - any Admin will approve";
}
