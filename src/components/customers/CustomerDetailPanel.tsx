import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  App,
  Avatar,
  Button,
  Checkbox,
  DatePicker,
  Dropdown,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Skeleton,
  Tabs,
  Tag,
  Typography,
} from "antd";
import {
  BankOutlined,
  DeleteOutlined,
  DownOutlined,
  FileTextOutlined,
  MailOutlined,
  PhoneOutlined,
  PlusOutlined,
  ShoppingOutlined,
  TagsOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import * as customerApi from "../../api/customer-api";
import * as customerExtrasApi from "../../api/customer-extras-api";
import * as userApi from "../../api/user-api";
import * as salesTeamApi from "../../api/sales-team-api";
import * as smartfloApi from "../../api/smartflo-api";
import type { Customer } from "../../types/customer";
import type { TeamMember } from "../../types/user";
import type { State } from "../../types/sales-team";
import type {
  AddressPayload,
  ContactPayload,
  CustomerAddress,
  CustomerContact,
  InvoicePayload,
  PaymentPayload,
  SalesOrderPayload,
  TimelineFeedItem,
  TransactionFeedItem,
} from "../../types/customer-extras";
import { WhatsAppLogo } from "../icons/BrandIcons";
import { useHasPermission } from "../../hooks/use-permission";
import { errorMessageFrom } from "../../utils/api-error";
import { avatarGradient, appTokens } from "../../utils/design-system";
import { formatCompactCurrency, formatCurrency, formatDate, formatDateTime, initials } from "../../utils/lead-format";
import { CREDIT_CATEGORY_COLORS, CUSTOMER_STATUSES, CUSTOMER_STATUS_LABELS, categoryColor, customerRisk } from "./customer-constants";

const { Text, Title } = Typography;

interface CustomerDetailPanelProps {
  customerId: string | null;
  onChanged?: () => void;
}

function SectionLabel({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
      <Text style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: appTokens.textTertiary }}>
        {children}
      </Text>
      {action}
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <Text style={{ fontSize: 11, fontWeight: 600, color: appTokens.textTertiary, display: "block" }}>{label}</Text>
      <Text style={{ fontSize: 13.5, color: appTokens.textPrimary }}>
        {value === null || value === undefined || value === "" ? <Text type="secondary">—</Text> : value}
      </Text>
    </div>
  );
}

function MetricBox({ label, value, danger }: { label: string; value: React.ReactNode; danger?: boolean }) {
  return (
    <div style={{ background: appTokens.surfaceMuted, borderRadius: appTokens.radius, padding: "10px 14px" }}>
      <Text style={{ fontSize: 11, fontWeight: 600, color: appTokens.textTertiary, display: "block" }}>{label}</Text>
      <Text strong style={{ fontSize: 17, color: danger ? appTokens.danger : appTokens.textPrimary }}>
        {value}
      </Text>
    </div>
  );
}

const CREDIT_CATEGORIES = ["A", "B", "C", "D"] as const;

function OverviewTab({
  customer,
  canUpdate,
  users,
  stateName,
  saving,
  onUpdate,
}: {
  customer: Customer;
  canUpdate: boolean;
  users: TeamMember[];
  stateName?: string;
  saving: boolean;
  onUpdate: (payload: Parameters<typeof customerApi.updateCustomer>[1]) => void;
}) {
  const exposure = customer.outstandingBalance;
  const limit = customer.creditLimit;
  const utilization = limit > 0 ? Math.min((exposure / limit) * 100, 100) : 0;
  const barColor = limit > 0 && exposure > limit ? appTokens.danger : utilization >= 80 ? appTokens.warning : appTokens.success;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <SectionLabel>Account summary</SectionLabel>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <MetricBox label="Lifetime value" value={formatCompactCurrency(customer.lifetimeValue ?? 0)} />
          <MetricBox label="Open orders" value={customer.openOrdersCount ?? 0} />
          <MetricBox label="Overdue invoices" value={customer.overdueInvoicesCount ?? 0} danger={(customer.overdueInvoicesCount ?? 0) > 0} />
          <MetricBox label="Open tickets" value={customer.openTicketCount ?? 0} danger={(customer.openTicketCount ?? 0) > 0} />
        </div>
      </div>

      <div>
        <SectionLabel>Credit position</SectionLabel>
        <div style={{ background: appTokens.surfaceMuted, borderRadius: appTokens.radius, padding: 14 }}>
          <div style={{ height: 8, borderRadius: 999, background: appTokens.border, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${utilization}%`, background: barColor, borderRadius: 999, transition: "width 0.3s" }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
            <Text style={{ fontSize: 12.5, color: appTokens.textSecondary }}>
              Exposure <Text strong style={{ color: barColor }}>{formatCurrency(exposure)}</Text>
            </Text>
            <Text style={{ fontSize: 12.5, color: appTokens.textTertiary }}>Limit {formatCurrency(limit)}</Text>
          </div>
        </div>
        {canUpdate && (
          <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
            <div style={{ flex: 1 }}>
              <Text style={{ fontSize: 11, fontWeight: 600, color: appTokens.textTertiary, display: "block", marginBottom: 4 }}>
                Credit limit
              </Text>
              <InputNumber
                value={customer.creditLimit}
                min={0}
                style={{ width: "100%" }}
                formatter={(v) => `₹ ${v}`}
                parser={(v) => Number((v ?? "0").replace(/[^\d.]/g, ""))}
                onBlur={(e) => {
                  const next = Number(e.target.value.replace(/[^\d.]/g, "")) || 0;
                  if (next !== customer.creditLimit) onUpdate({ creditLimit: next });
                }}
                disabled={saving}
              />
            </div>
            <div style={{ flex: 1 }}>
              <Text style={{ fontSize: 11, fontWeight: 600, color: appTokens.textTertiary, display: "block", marginBottom: 4 }}>
                Outstanding balance
              </Text>
              <InputNumber
                value={customer.outstandingBalance}
                min={0}
                style={{ width: "100%" }}
                formatter={(v) => `₹ ${v}`}
                parser={(v) => Number((v ?? "0").replace(/[^\d.]/g, ""))}
                onBlur={(e) => {
                  const next = Number(e.target.value.replace(/[^\d.]/g, "")) || 0;
                  if (next !== customer.outstandingBalance) onUpdate({ outstandingBalance: next });
                }}
                disabled={saving}
              />
            </div>
            <div style={{ width: 90 }}>
              <Text style={{ fontSize: 11, fontWeight: 600, color: appTokens.textTertiary, display: "block", marginBottom: 4 }}>
                Rating
              </Text>
              <Select
                allowClear
                placeholder="—"
                value={customer.creditCategory ?? undefined}
                onChange={(v) => onUpdate({ creditCategory: (v as Customer["creditCategory"]) ?? null })}
                style={{ width: "100%" }}
                disabled={saving}
                options={CREDIT_CATEGORIES.map((c) => ({ value: c, label: c }))}
              />
            </div>
          </div>
        )}
      </div>

      <div>
        <SectionLabel>Account</SectionLabel>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Category" value={customer.category} />
          <Field label="Territory" value={customer.territory} />
          <div>
            <Text style={{ fontSize: 11, fontWeight: 600, color: appTokens.textTertiary, display: "block" }}>Salesperson</Text>
            {canUpdate && users.length > 0 ? (
              <Select
                showSearch
                allowClear
                placeholder="Unassigned"
                value={customer.ownerId ?? undefined}
                onChange={(ownerId) => onUpdate({ ownerId: ownerId ?? null })}
                optionFilterProp="label"
                loading={saving}
                size="small"
                style={{ width: "100%", marginTop: 2 }}
                options={users.map((u) => ({ value: u.id, label: u.name }))}
              />
            ) : (
              <Text style={{ fontSize: 13.5 }}>{customer.ownerName ?? "Unassigned"}</Text>
            )}
          </div>
          <Field label="Customer since" value={formatDateTime(customer.createdAt)} />
          <div style={{ gridColumn: "1 / -1" }}>
            <Field
              label="Address"
              value={[customer.addressLine1, customer.addressLine2, stateName, customer.pincode].filter(Boolean).join(", ")}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function AddContactModal({ open, onClose, onCreated, customerId }: { open: boolean; onClose: () => void; onCreated: () => void; customerId: string }) {
  const { message } = App.useApp();
  const [form] = Form.useForm<ContactPayload>();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (values: ContactPayload) => {
    setSubmitting(true);
    try {
      await customerExtrasApi.createContact(customerId, values);
      message.success("Contact added");
      form.resetFields();
      onCreated();
    } catch (err) {
      message.error(errorMessageFrom(err, "Failed to add contact"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal title="Add contact" open={open} onCancel={onClose} onOk={() => form.submit()} confirmLoading={submitting} destroyOnHidden>
      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Form.Item name="name" label="Name" rules={[{ required: true, message: "Name is required" }]}>
          <Input placeholder="e.g. Sunil Meena" />
        </Form.Item>
        <Form.Item name="role" label="Role">
          <Input placeholder="e.g. Owner / decision maker" />
        </Form.Item>
        <Form.Item name="phone" label="Phone">
          <Input placeholder="+91 ..." />
        </Form.Item>
        <Form.Item name="email" label="Email">
          <Input placeholder="optional" />
        </Form.Item>
        <Form.Item name="isPrimary" valuePropName="checked" initialValue={false}>
          <Checkbox>Set as primary contact</Checkbox>
        </Form.Item>
      </Form>
    </Modal>
  );
}

function AddAddressModal({ open, onClose, onCreated, customerId }: { open: boolean; onClose: () => void; onCreated: () => void; customerId: string }) {
  const { message } = App.useApp();
  const [form] = Form.useForm<AddressPayload>();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (values: AddressPayload) => {
    setSubmitting(true);
    try {
      await customerExtrasApi.createAddress(customerId, values);
      message.success("Address added");
      form.resetFields();
      onCreated();
    } catch (err) {
      message.error(errorMessageFrom(err, "Failed to add address"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal title="Add address" open={open} onCancel={onClose} onOk={() => form.submit()} confirmLoading={submitting} destroyOnHidden>
      <Form form={form} layout="vertical" onFinish={handleSubmit} initialValues={{ type: "shipping" }}>
        <Form.Item name="type" label="Type" rules={[{ required: true }]}>
          <Select options={[{ value: "billing", label: "Billing" }, { value: "shipping", label: "Shipping" }]} />
        </Form.Item>
        <Form.Item name="label" label="Label">
          <Input placeholder="e.g. Head office, Warehouse" />
        </Form.Item>
        <Form.Item name="addressLine1" label="Address line 1" rules={[{ required: true, message: "Address is required" }]}>
          <Input />
        </Form.Item>
        <Form.Item name="addressLine2" label="Address line 2">
          <Input />
        </Form.Item>
        <Form.Item name="city" label="City">
          <Input />
        </Form.Item>
        <Form.Item name="state" label="State">
          <Input />
        </Form.Item>
        <Form.Item name="pincode" label="Pincode">
          <Input />
        </Form.Item>
      </Form>
    </Modal>
  );
}

function ContactsTab({ customerId, canUpdate }: { customerId: string; canUpdate: boolean }) {
  const { message } = App.useApp();
  const [contacts, setContacts] = useState<CustomerContact[] | null>(null);
  const [addresses, setAddresses] = useState<CustomerAddress[] | null>(null);
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [addressModalOpen, setAddressModalOpen] = useState(false);

  const load = () => {
    customerExtrasApi.listContacts(customerId).then(setContacts).catch(() => setContacts([]));
    customerExtrasApi.listAddresses(customerId).then(setAddresses).catch(() => setAddresses([]));
  };

  useEffect(load, [customerId]);

  const removeContact = async (id: string) => {
    try {
      await customerExtrasApi.deleteContact(id);
      load();
    } catch (err) {
      message.error(errorMessageFrom(err, "Failed to remove contact"));
    }
  };
  const removeAddress = async (id: string) => {
    try {
      await customerExtrasApi.deleteAddress(id);
      load();
    } catch (err) {
      message.error(errorMessageFrom(err, "Failed to remove address"));
    }
  };

  if (contacts === null || addresses === null) return <Skeleton active paragraph={{ rows: 3 }} />;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <SectionLabel
          action={
            canUpdate && (
              <Button size="small" type="link" icon={<PlusOutlined />} onClick={() => setContactModalOpen(true)}>
                Add
              </Button>
            )
          }
        >
          Contacts
        </SectionLabel>
        {contacts.length === 0 ? (
          <Text type="secondary">No contacts added yet</Text>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {contacts.map((c) => (
              <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                <div style={{ minWidth: 0 }}>
                  <Text strong style={{ fontSize: 13.5 }}>
                    {c.name}
                  </Text>
                  <div>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {[c.role, c.phone].filter(Boolean).join(" · ") || "—"}
                    </Text>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
                  {c.isPrimary && (
                    <Tag color={appTokens.primary} style={{ margin: 0 }}>
                      Primary
                    </Tag>
                  )}
                  {canUpdate && (
                    <Popconfirm title="Remove this contact?" onConfirm={() => removeContact(c.id)}>
                      <Button size="small" type="text" icon={<DeleteOutlined />} danger />
                    </Popconfirm>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <SectionLabel
          action={
            canUpdate && (
              <Button size="small" type="link" icon={<PlusOutlined />} onClick={() => setAddressModalOpen(true)}>
                Add
              </Button>
            )
          }
        >
          Addresses
        </SectionLabel>
        {addresses.length === 0 ? (
          <Text type="secondary">No addresses added yet</Text>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {addresses.map((a) => (
              <div key={a.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, padding: "8px 10px", border: `1px solid ${appTokens.borderLight}`, borderRadius: 8 }}>
                <div style={{ minWidth: 0 }}>
                  <Text strong style={{ fontSize: 13, textTransform: "capitalize" }}>
                    {a.type}
                  </Text>
                  {a.label && (
                    <Text style={{ fontSize: 13 }}> · {a.label}</Text>
                  )}
                  <div>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {[a.addressLine1, a.addressLine2, a.city, a.state, a.pincode].filter(Boolean).join(", ")}
                    </Text>
                  </div>
                </div>
                {canUpdate && (
                  <Popconfirm title="Remove this address?" onConfirm={() => removeAddress(a.id)}>
                    <Button size="small" type="text" icon={<DeleteOutlined />} danger />
                  </Popconfirm>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <AddContactModal open={contactModalOpen} onClose={() => setContactModalOpen(false)} onCreated={() => { setContactModalOpen(false); load(); }} customerId={customerId} />
      <AddAddressModal open={addressModalOpen} onClose={() => setAddressModalOpen(false)} onCreated={() => { setAddressModalOpen(false); load(); }} customerId={customerId} />
    </div>
  );
}

const TRANSACTION_ICON: Record<TransactionFeedItem["kind"], React.ReactNode> = {
  sales_order: <ShoppingOutlined />,
  invoice: <FileTextOutlined />,
  payment: <BankOutlined />,
};

const TRANSACTION_STATUS_COLOR: Record<string, string> = {
  confirmed: appTokens.primary,
  delivered: appTokens.success,
  cancelled: appTokens.textTertiary,
  unpaid: appTokens.warning,
  partially_paid: appTokens.warning,
  paid: appTokens.success,
  overdue: appTokens.danger,
  cleared: appTokens.success,
  pending: appTokens.warning,
  bounced: appTokens.danger,
};

function AddTransactionModal({
  kind,
  open,
  onClose,
  onCreated,
  customerId,
}: {
  kind: "sales_order" | "invoice" | "payment" | null;
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  customerId: string;
}) {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (values: Record<string, unknown>) => {
    setSubmitting(true);
    try {
      if (kind === "sales_order") {
        await customerExtrasApi.createSalesOrder(customerId, values as unknown as SalesOrderPayload);
      } else if (kind === "invoice") {
        const dueDate = values.dueDate ? (values.dueDate as dayjs.Dayjs).format("YYYY-MM-DD") : undefined;
        await customerExtrasApi.createInvoice(customerId, { ...(values as unknown as InvoicePayload), dueDate });
      } else if (kind === "payment") {
        await customerExtrasApi.createPayment(customerId, values as unknown as PaymentPayload);
      }
      message.success("Saved");
      form.resetFields();
      onCreated();
    } catch (err) {
      message.error(errorMessageFrom(err, "Failed to save"));
    } finally {
      setSubmitting(false);
    }
  };

  const title = kind === "sales_order" ? "New sales order" : kind === "invoice" ? "New invoice" : "Record payment";

  return (
    <Modal title={title} open={open} onCancel={onClose} onOk={() => form.submit()} confirmLoading={submitting} destroyOnHidden>
      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Form.Item name="amount" label="Amount" rules={[{ required: true, message: "Amount is required" }]}>
          {/* Explicit <number> generic - with no value prop to anchor inference,
              a bare numeric min={1} narrows T to the literal 1, not number. */}
          <InputNumber<number> min={1} style={{ width: "100%" }} formatter={(v) => `₹ ${v}`} parser={(v) => Number((v ?? "0").replace(/[^\d.]/g, ""))} />
        </Form.Item>
        {kind === "sales_order" && (
          <Form.Item name="status" label="Status" initialValue="confirmed">
            <Select options={[{ value: "confirmed", label: "Confirmed" }, { value: "delivered", label: "Delivered" }, { value: "cancelled", label: "Cancelled" }]} />
          </Form.Item>
        )}
        {kind === "invoice" && (
          <>
            <Form.Item name="status" label="Status" initialValue="unpaid">
              <Select options={[{ value: "unpaid", label: "Unpaid" }, { value: "partially_paid", label: "Partially paid" }, { value: "paid", label: "Paid" }]} />
            </Form.Item>
            <Form.Item name="dueDate" label="Due date">
              <DatePicker style={{ width: "100%" }} />
            </Form.Item>
          </>
        )}
        {kind === "payment" && (
          <>
            <Form.Item name="method" label="Method">
              <Input placeholder="e.g. NEFT, Cash, Cheque" />
            </Form.Item>
            <Form.Item name="status" label="Status" initialValue="cleared">
              <Select options={[{ value: "cleared", label: "Cleared" }, { value: "pending", label: "Pending" }, { value: "bounced", label: "Bounced" }]} />
            </Form.Item>
          </>
        )}
        {kind === "sales_order" && (
          <Form.Item name="notes" label="Notes">
            <Input.TextArea rows={2} />
          </Form.Item>
        )}
      </Form>
    </Modal>
  );
}

function TransactionsTab({ customerId, canUpdate, onDataChanged }: { customerId: string; canUpdate: boolean; onDataChanged: () => void }) {
  const [items, setItems] = useState<TransactionFeedItem[] | null>(null);
  const [addKind, setAddKind] = useState<"sales_order" | "invoice" | "payment" | null>(null);

  const load = () => {
    customerApi.getTransactions(customerId).then(setItems).catch(() => setItems([]));
  };
  useEffect(load, [customerId]);

  if (items === null) return <Skeleton active paragraph={{ rows: 3 }} />;

  return (
    <div>
      {canUpdate && (
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
          <Dropdown
            menu={{
              items: [
                { key: "sales_order", label: "Sales order" },
                { key: "invoice", label: "Invoice" },
                { key: "payment", label: "Payment" },
              ],
              onClick: ({ key }) => setAddKind(key as "sales_order" | "invoice" | "payment"),
            }}
          >
            <Button size="small" icon={<PlusOutlined />}>
              Add <DownOutlined style={{ fontSize: 10 }} />
            </Button>
          </Dropdown>
        </div>
      )}
      {items.length === 0 ? (
        <Text type="secondary">No sales orders, invoices, or payments recorded yet</Text>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {items.map((item) => (
            <div
              key={`${item.kind}-${item.id}`}
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: "9px 10px", border: `1px solid ${appTokens.borderLight}`, borderRadius: 8 }}
            >
              <div style={{ display: "flex", gap: 10, alignItems: "center", minWidth: 0 }}>
                <span style={{ color: appTokens.textTertiary }}>{TRANSACTION_ICON[item.kind]}</span>
                <div style={{ minWidth: 0 }}>
                  <Text strong style={{ fontSize: 13 }}>
                    {item.label}
                  </Text>
                  <div>
                    <Text type="secondary" style={{ fontSize: 11.5 }}>
                      {formatDate(item.date)}
                    </Text>
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 10, alignItems: "center", flexShrink: 0 }}>
                <Tag color={TRANSACTION_STATUS_COLOR[item.status] ?? "default"} style={{ margin: 0, textTransform: "capitalize" }}>
                  {item.status.replace("_", " ")}
                </Tag>
                <Text strong style={{ fontSize: 13, minWidth: 80, textAlign: "right" }}>
                  {formatCurrency(item.amount)}
                </Text>
              </div>
            </div>
          ))}
        </div>
      )}

      <AddTransactionModal
        kind={addKind}
        open={addKind !== null}
        onClose={() => setAddKind(null)}
        onCreated={() => {
          setAddKind(null);
          load();
          onDataChanged();
        }}
        customerId={customerId}
      />
    </div>
  );
}

const TIMELINE_ICON: Record<TimelineFeedItem["kind"], React.ReactNode> = {
  activity: <PhoneOutlined />,
  ticket: <TagsOutlined />,
  audit: <BankOutlined />,
};

function ActivityTimelineTab({ customerId }: { customerId: string }) {
  const [items, setItems] = useState<TimelineFeedItem[] | null>(null);

  useEffect(() => {
    customerApi.getTimeline(customerId).then(setItems).catch(() => setItems([]));
  }, [customerId]);

  if (items === null) return <Skeleton active paragraph={{ rows: 3 }} />;
  if (items.length === 0) return <Text type="secondary">No activity logged for this account yet</Text>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {items.map((item) => (
        <div key={`${item.kind}-${item.id}`} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
          <div
            style={{
              width: 26,
              height: 26,
              borderRadius: "50%",
              background: appTokens.surfaceMuted,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              fontSize: 12,
              color: appTokens.textSecondary,
            }}
          >
            {TIMELINE_ICON[item.kind]}
          </div>
          <div style={{ minWidth: 0 }}>
            <Text style={{ fontSize: 13.5 }}>{item.summary}</Text>
            <div>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {item.detail ? `${item.detail} · ` : ""}
                {formatDateTime(item.date)}
                {item.actorName ? ` · ${item.actorName}` : ""}
              </Text>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function CustomerDetailPanel({ customerId, onChanged }: CustomerDetailPanelProps) {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const hasPermission = useHasPermission();
  const canUpdate = hasPermission("customers.update");

  const [loading, setLoading] = useState(true);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [users, setUsers] = useState<TeamMember[]>([]);
  const [states, setStates] = useState<State[]>([]);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState("overview");
  const [calling, setCalling] = useState(false);

  const load = () => {
    if (!customerId) return;
    setLoading(true);
    // Only the customer itself is required - the reassignment dropdown's
    // user list needs users.view, which agent-tier owners (who can still
    // have customers.update) don't have, and states is best-effort display
    // data. Neither should be able to take down the whole panel just
    // because one is 403'd for this role.
    Promise.all([customerApi.getCustomer(customerId), userApi.listUsers().catch(() => []), salesTeamApi.listStates().catch(() => [])])
      .then(([c, u, s]) => {
        setCustomer(c);
        setUsers(u);
        setStates(s);
      })
      .catch(() => message.error("Failed to load this customer"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    setCustomer(null);
    setTab("overview");
    if (customerId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId]);

  const applyUpdate = async (payload: Parameters<typeof customerApi.updateCustomer>[1]) => {
    if (!customerId) return;
    setSaving(true);
    try {
      // Re-fetches rather than using the PATCH response directly - that
      // response comes from a plain UPDATE...RETURNING with no owner/ticket
      // JOIN, so using it as-is would blank ownerName back to "Unassigned"
      // and drop openTicketCount/lifetimeValue/etc.
      await customerApi.updateCustomer(customerId, payload);
      const fresh = await customerApi.getCustomer(customerId);
      setCustomer(fresh);
      onChanged?.();
    } catch (err) {
      message.error(errorMessageFrom(err, "Failed to update this customer"));
    } finally {
      setSaving(false);
    }
  };

  const handleCall = async () => {
    if (!customer?.leadId) return;
    setCalling(true);
    try {
      await smartfloApi.callLead(customer.leadId);
      message.success("Calling now");
    } catch (err) {
      message.error(errorMessageFrom(err, "Failed to place the call"));
    } finally {
      setCalling(false);
    }
  };

  if (!customerId) {
    return (
      <div style={{ minHeight: 420, display: "flex", alignItems: "center", justifyContent: "center", padding: 40 }}>
        <Empty description="Select a customer to see their full record" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      </div>
    );
  }

  if (loading || !customer) {
    return (
      <div style={{ padding: 20 }}>
        <Skeleton active avatar paragraph={{ rows: 4 }} />
      </div>
    );
  }

  const risk = customerRisk(customer);
  const stateName = customer.stateId ? states.find((s) => s.id === customer.stateId)?.name : undefined;

  return (
    <div>
      <div style={{ padding: "16px 20px", borderBottom: `1px solid ${appTokens.borderLight}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
          <div style={{ display: "flex", gap: 12, minWidth: 0 }}>
            <Avatar size={40} style={{ background: avatarGradient(customer.fullName), fontWeight: 600, flexShrink: 0 }}>
              {initials(customer.fullName)}
            </Avatar>
            <div style={{ minWidth: 0 }}>
              <Title level={5} style={{ margin: 0, color: appTokens.textPrimary }}>
                {customer.fullName}
              </Title>
              <Text style={{ fontSize: 12.5, color: appTokens.textSecondary }}>
                {customer.companyName ?? "No company on file"}
                {customer.ownerName ? ` · owner ${customer.ownerName}` : ""}
              </Text>
            </div>
          </div>
          <div style={{ display: "flex", gap: 6, flexShrink: 0, alignItems: "center" }}>
            {customer.creditCategory && (
              <Tag color={CREDIT_CATEGORY_COLORS[customer.creditCategory]} style={{ margin: 0 }}>
                Rating {customer.creditCategory}
              </Tag>
            )}
            {customer.category && (
              <Tag color={categoryColor(customer.category)} style={{ margin: 0 }}>
                {customer.category}
              </Tag>
            )}
            <Tag color={risk.color} style={{ margin: 0 }}>
              {risk.label}
            </Tag>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
          <Button size="small" icon={<PhoneOutlined />} loading={calling} disabled={!customer.leadId} onClick={handleCall}>
            Call
          </Button>
          <Button
            size="small"
            icon={<MailOutlined />}
            disabled={!customer.email}
            onClick={() => customer.email && (window.location.href = `mailto:${customer.email}`)}
          >
            Email
          </Button>
          <Button
            size="small"
            icon={<WhatsAppLogo size={13} />}
            onClick={() => navigate(`/leads?leadId=${customer.leadId}&tab=whatsapp`)}
          >
            WhatsApp
          </Button>
          <Button size="small" icon={<TagsOutlined />} onClick={() => navigate("/support-tickets")}>
            Tickets{customer.openTicketCount !== undefined ? ` (${customer.openTicketCount})` : ""}
          </Button>
          <Button size="small" onClick={() => navigate(`/leads?leadId=${customer.leadId}`)}>
            View lead
          </Button>
        </div>
      </div>

      <div style={{ padding: "0 20px" }}>
        <Tabs
          activeKey={tab}
          onChange={setTab}
          size="small"
          items={[
            { key: "overview", label: "Overview" },
            { key: "contacts", label: "Contacts" },
            { key: "transactions", label: "Transactions" },
            { key: "activity", label: "Activity" },
          ]}
        />
        <div style={{ paddingTop: 4, paddingBottom: 20 }}>
          {tab === "overview" && (
            <OverviewTab customer={customer} canUpdate={canUpdate} users={users} stateName={stateName} saving={saving} onUpdate={applyUpdate} />
          )}
          {tab === "contacts" && <ContactsTab customerId={customer.id} canUpdate={canUpdate} />}
          {tab === "transactions" && <TransactionsTab customerId={customer.id} canUpdate={canUpdate} onDataChanged={load} />}
          {tab === "activity" && <ActivityTimelineTab customerId={customer.id} />}
        </div>
      </div>

      {canUpdate && (
        <div style={{ padding: "12px 20px", borderTop: `1px solid ${appTokens.borderLight}`, display: "flex", justifyContent: "flex-end" }}>
          <Select
            value={customer.status}
            onChange={(status) => applyUpdate({ status })}
            loading={saving}
            size="small"
            style={{ width: 140 }}
            options={CUSTOMER_STATUSES.map((s) => ({ value: s, label: CUSTOMER_STATUS_LABELS[s] }))}
          />
        </div>
      )}
    </div>
  );
}
