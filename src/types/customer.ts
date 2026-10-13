export interface Customer {
  id: string;
  customerNumber: number;
  customerLabel: string;
  leadId: string;
  fullName: string;
  contactName: string | null;
  phone: string | null;
  altPhone: string | null;
  email: string | null;
  companyName: string | null;
  category: string | null;
  ownerId: string | null;
  ownerName: string | null;
  city: string | null;
  zoneId: string | null;
  stateId: string | null;
  districtId: string | null;
  areaId: string | null;
  pincode: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  territory: string | null;
  creditLimit: number;
  outstandingBalance: number;
  creditCategory: "A" | "B" | "C" | "D" | null;
  status: "active" | "inactive" | "on_hold";
  openTicketCount?: number;
  lifetimeValue?: number;
  openOrdersCount?: number;
  overdueInvoicesCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateCustomerPayload {
  ownerId?: string | null;
  status?: Customer["status"];
  creditLimit?: number;
  outstandingBalance?: number;
  creditCategory?: Customer["creditCategory"];
}
