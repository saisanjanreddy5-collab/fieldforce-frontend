export interface QuoteLineItemInput {
  description: string;
  quantity: number;
  unitPrice: number;
  taxPercent: number;
}

export interface QuoteLineItem extends QuoteLineItemInput {
  lineSubtotal: number;
  lineTax: number;
  lineTotal: number;
}

export type QuoteStatus = "draft" | "sent" | "accepted" | "rejected";

export interface Quote {
  id: string;
  quoteNumber: number;
  quoteLabel: string;
  leadId: string;
  opportunityId: string;
  status: QuoteStatus;
  currentVersion: number;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Returned on list endpoints (main list, lead's quotes, opportunity's quotes). */
export interface QuoteListItem extends Quote {
  leadFullName: string;
  opportunityName: string | null;
  createdByName: string | null;
  grandTotal: number;
  /** The lead's category (FOFO / COCO / ...). */
  leadCategory: string | null;
  /** Salesperson = the lead's owner (who the deal belongs to). */
  ownerId: string | null;
  ownerName: string | null;
}

export interface QuoteVersion {
  id: string;
  quoteId: string;
  versionNumber: number;
  lineItems: QuoteLineItem[];
  subtotal: number;
  taxTotal: number;
  grandTotal: number;
  notes: string | null;
  changeSummary: string | null;
  createdBy: string | null;
  createdByName: string | null;
  createdAt: string;
}

export interface QuoteDetail {
  quote: Quote;
  currentVersion: QuoteVersion;
  versions: QuoteVersion[];
}

export interface CreateQuotePayload {
  leadId: string;
  opportunityId: string;
  lineItems: QuoteLineItemInput[];
  notes?: string;
}

export interface UpdateQuotePayload {
  lineItems: QuoteLineItemInput[];
  notes?: string;
  changeSummary?: string;
}

export interface ListQuotesFilters {
  leadId?: string;
  opportunityId?: string;
  status?: string;
  search?: string;
}
