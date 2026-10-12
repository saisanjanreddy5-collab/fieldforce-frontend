export interface CustomerContact {
  id: string;
  customerId: string;
  name: string;
  role: string | null;
  phone: string | null;
  email: string | null;
  isPrimary: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ContactPayload {
  name: string;
  role?: string;
  phone?: string;
  email?: string;
  isPrimary?: boolean;
}

export interface CustomerAddress {
  id: string;
  customerId: string;
  type: "billing" | "shipping";
  label: string | null;
  addressLine1: string;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AddressPayload {
  type: "billing" | "shipping";
  label?: string;
  addressLine1: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  pincode?: string;
}

export interface SalesOrder {
  id: string;
  orderNumber: number;
  orderLabel: string;
  customerId: string;
  orderDate: string;
  status: "confirmed" | "delivered" | "cancelled";
  amount: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SalesOrderPayload {
  orderDate?: string;
  status?: SalesOrder["status"];
  amount: number;
  notes?: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: number;
  invoiceLabel: string;
  customerId: string;
  salesOrderId: string | null;
  invoiceDate: string;
  dueDate: string | null;
  status: "unpaid" | "partially_paid" | "paid";
  isOverdue: boolean;
  amount: number;
  createdAt: string;
  updatedAt: string;
}

export interface InvoicePayload {
  salesOrderId?: string | null;
  invoiceDate?: string;
  dueDate?: string;
  status?: Invoice["status"];
  amount: number;
}

export interface Payment {
  id: string;
  receiptNumber: number;
  receiptLabel: string;
  customerId: string;
  invoiceId: string | null;
  paymentDate: string;
  method: string | null;
  status: "cleared" | "pending" | "bounced";
  amount: number;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentPayload {
  invoiceId?: string | null;
  paymentDate?: string;
  method?: string;
  status?: Payment["status"];
  amount: number;
}

export interface TransactionFeedItem {
  kind: "sales_order" | "invoice" | "payment";
  id: string;
  label: string;
  date: string;
  status: string;
  amount: number;
}

export interface TimelineFeedItem {
  kind: "activity" | "ticket" | "audit";
  id: string;
  summary: string;
  detail: string | null;
  date: string;
  actorName: string | null;
}
