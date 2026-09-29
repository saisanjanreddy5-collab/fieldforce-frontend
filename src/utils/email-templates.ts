import dayjs from "dayjs";
import type { Lead } from "../types/lead";

const firstName = (lead: Lead) => lead.fullName.trim().split(" ")[0] || lead.fullName.trim();

// The values a template's {{tokens}} resolve against for a specific lead -
// templates themselves now live in Settings > Templates (message_templates),
// editable without a code change; only this per-lead personalization logic
// (what "the store line" or "proposal details" actually say) stays in code.
export function templateTokens(lead: Lead, activityDueDate: string | null): Record<string, string> {
  const proposalParts: string[] = [];
  if (lead.investmentCapacity) proposalParts.push(`investment capacity ₹${lead.investmentCapacity.toLocaleString("en-IN")}`);
  if (lead.marginSlab) proposalParts.push(`margin slab ${lead.marginSlab}`);

  return {
    firstName: firstName(lead),
    storeLine: lead.storeName
      ? `Based on what you've shared, ${lead.storeName}${lead.carpetArea ? ` (${lead.carpetArea})` : ""} looks like a good fit for our franchise format.`
      : "I'd love to understand your store plans in more detail.",
    storeAddress: lead.storeAddress ?? "your store location",
    visitTime: activityDueDate ? dayjs(activityDueDate).format("dddd, D MMMM [at] h:mm A") : "the time we discussed",
    storeName: lead.storeName ?? lead.fullName,
    proposalDetails: proposalParts.length > 0 ? ` (${proposalParts.join(", ")})` : "",
  };
}

export function applyTemplateTokens(text: string, tokens: Record<string, string>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_, key: string) => tokens[key] ?? "");
}
