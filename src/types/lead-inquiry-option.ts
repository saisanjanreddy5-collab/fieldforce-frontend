export type InquiryOptionFieldType = "category" | "source";

export interface LeadInquiryOption {
  id: string;
  fieldType: InquiryOptionFieldType;
  label: string;
  isActive: boolean;
}

export interface CreateLeadInquiryOptionPayload {
  fieldType: InquiryOptionFieldType;
  label: string;
}

export interface UpdateLeadInquiryOptionPayload {
  label?: string;
  isActive?: boolean;
}
