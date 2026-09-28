import dayjs from "dayjs";
import type { Lead } from "../types/lead";

export interface EmailTemplate {
  key: string;
  label: string;
  build: (lead: Lead, activityDueDate: string | null) => { subject: string; body: string };
}

const firstName = (lead: Lead) => lead.fullName.trim().split(" ")[0] || lead.fullName.trim();

export const EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    key: "blank",
    label: "Blank email",
    build: () => ({ subject: "", body: "" }),
  },
  {
    key: "fofo_intro",
    label: "FOFO intro pack",
    build: (lead) => {
      const storeLine = lead.storeName
        ? `Based on what you've shared, ${lead.storeName}${lead.carpetArea ? ` (${lead.carpetArea})` : ""} looks like a good fit for our franchise format.`
        : "I'd love to understand your store plans in more detail.";
      return {
        subject: "FOFO franchise — details and next steps",
        body: `Dear ${firstName(lead)},\n\nThank you for your interest in a franchise with us. I've attached our FOFO franchise pack, which covers the investment range, margin slabs and the support we provide on interiors and signage.\n\n${storeLine}\n\nLet me know a good time for a call or site visit this week.\n\nRegards,`,
      };
    },
  },
  {
    key: "site_visit_confirmation",
    label: "Site visit confirmation",
    build: (lead, activityDueDate) => {
      const address = lead.storeAddress ?? "your store location";
      const when = activityDueDate ? dayjs(activityDueDate).format("dddd, D MMMM [at] h:mm A") : "the time we discussed";
      return {
        subject: `Site visit confirmed — ${address}`,
        body: `Dear ${firstName(lead)},\n\nConfirming our site visit at ${address} on ${when}. Please keep the rent agreement and shop measurements handy.\n\nLet me know if anything changes on your end.\n\nRegards,`,
      };
    },
  },
  {
    key: "commercial_proposal",
    label: "Commercial proposal",
    build: (lead) => {
      const parts: string[] = [];
      if (lead.investmentCapacity) parts.push(`investment capacity ₹${lead.investmentCapacity.toLocaleString("en-IN")}`);
      if (lead.marginSlab) parts.push(`margin slab ${lead.marginSlab}`);
      const details = parts.length > 0 ? ` (${parts.join(", ")})` : "";
      return {
        subject: `Commercial proposal — ${lead.storeName ?? lead.fullName}`,
        body: `Dear ${firstName(lead)},\n\nAs discussed, here is our commercial proposal${details}.\n\nThe proposal is valid for 30 days. Happy to walk through it on a call this week.\n\nRegards,`,
      };
    },
  },
  {
    key: "consent_dpdp",
    label: "Consent request (DPDP)",
    build: (lead) => ({
      subject: "Your consent for communication",
      body: `Dear ${firstName(lead)},\n\nTo keep you updated on your enquiry, we need your consent to contact you by phone, WhatsApp and email. You can withdraw it at any time by replying to this email.\n\nPlease reply "confirm" to this email to record your consent.\n\nRegards,`,
    }),
  },
];
