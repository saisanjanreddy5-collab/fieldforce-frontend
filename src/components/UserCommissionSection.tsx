import { useEffect, useState } from "react";
import { Button, Form, Input, Popconfirm, Radio, Select, Table, Typography, message } from "antd";
import { isAxiosError } from "axios";
import * as userCommissionApi from "../api/user-commission-api";
import type { CommissionBasis, PayoutCycle, UserCommission } from "../types/user-commission";
import { useHasPermission } from "../hooks/use-permission";

const { Text } = Typography;

const BASIS_OPTIONS: { value: CommissionBasis; label: string }[] = [
  { value: "collected_revenue", label: "Collected revenue" },
  { value: "invoiced_revenue", label: "Invoiced revenue" },
  { value: "gross_margin", label: "Gross margin" },
  { value: "units_sold", label: "Units sold" },
];
const BASIS_LABELS: Record<CommissionBasis, string> = Object.fromEntries(BASIS_OPTIONS.map((o) => [o.value, o.label])) as Record<
  CommissionBasis,
  string
>;

const PAYOUT_CYCLE_OPTIONS: { value: PayoutCycle; label: string }[] = [
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "half_yearly", label: "Half-yearly" },
  { value: "annual", label: "Annual" },
];
const PAYOUT_CYCLE_LABELS: Record<PayoutCycle, string> = Object.fromEntries(PAYOUT_CYCLE_OPTIONS.map((o) => [o.value, o.label])) as Record<
  PayoutCycle,
  string
>;

interface FormValues {
  basis: CommissionBasis;
  rate?: string;
  appliesTo?: string;
  payoutCycle: PayoutCycle;
}

interface UserCommissionSectionProps {
  userId: string;
}

// A per-employee commission arrangement - distinct from the shared
// commission_rules catalog (tied to an incentive plan). Configuration only,
// same honesty convention as the rest of this tab: no payout engine reads
// any of this.
export function UserCommissionSection({ userId }: UserCommissionSectionProps) {
  const hasPermission = useHasPermission();
  const [commissions, setCommissions] = useState<UserCommission[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [form] = Form.useForm<FormValues>();

  const load = () => {
    setLoading(true);
    userCommissionApi
      .listUserCommissions(userId, showArchived)
      .then(setCommissions)
      .catch(() => message.error("Failed to load commission arrangements"))
      .finally(() => setLoading(false));
  };

  useEffect(load, [userId, showArchived]);

  const canManage = hasPermission("user_commissions.create");

  const handleDelete = async (id: string) => {
    try {
      await userCommissionApi.deleteUserCommission(id);
      message.success("Commission arrangement archived");
      load();
    } catch {
      message.error("Failed to archive commission arrangement");
    }
  };

  const handleRestore = async (id: string) => {
    try {
      await userCommissionApi.restoreUserCommission(id);
      message.success("Commission arrangement restored");
      load();
    } catch {
      message.error("Failed to restore commission arrangement");
    }
  };

  const handleSubmit = async (values: FormValues) => {
    setSaving(true);
    try {
      await userCommissionApi.createUserCommission({
        userId,
        basis: values.basis,
        rate: values.rate,
        appliesTo: values.appliesTo,
        payoutCycle: values.payoutCycle,
      });
      message.success("Commission arrangement added");
      form.resetFields();
      load();
    } catch (err) {
      const description =
        isAxiosError<{ message?: string }>(err) && err.response?.data.message
          ? err.response.data.message
          : "Failed to add commission arrangement";
      message.error(description);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      {canManage && (
        <Form<FormValues> form={form} layout="vertical" onFinish={handleSubmit} initialValues={{ payoutCycle: "quarterly" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
            <Form.Item name="basis" label="Basis" rules={[{ required: true, message: "Pick a basis" }]}>
              <Radio.Group options={BASIS_OPTIONS} />
            </Form.Item>
            <Form.Item name="rate" label="Rate">
              <Input placeholder="e.g. 1.2%" />
            </Form.Item>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
            <Form.Item name="appliesTo" label="Applies to">
              <Input placeholder="e.g. All orders" />
            </Form.Item>
            <Form.Item name="payoutCycle" label="Payout cycle" rules={[{ required: true }]}>
              <Select options={PAYOUT_CYCLE_OPTIONS} />
            </Form.Item>
          </div>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={saving}>
              Add commission arrangement
            </Button>
          </Form.Item>
        </Form>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <Text strong>{showArchived ? "Archived arrangements" : "Arrangements"}</Text>
        {canManage && (
          <Button size="small" onClick={() => setShowArchived((v) => !v)}>
            {showArchived ? "Show active" : "Show archived"}
          </Button>
        )}
      </div>

      {/* Bounded + internally scrollable, same reasoning as LeadQueue.tsx's
          own row list - an employee with many arrangements over the years
          must never force this whole settings tab to grow without limit. */}
      <div style={{ maxHeight: 420, overflowY: "auto" }}>
        <Table<UserCommission>
          size="small"
          rowKey="id"
          loading={loading}
          dataSource={commissions}
          pagination={false}
          locale={{ emptyText: showArchived ? "No archived arrangements" : "No arrangements yet" }}
          columns={[
            { title: "Basis", key: "basis", render: (_, c) => BASIS_LABELS[c.basis] },
            { title: "Rate", dataIndex: "rate", render: (v: string | null) => v ?? "-" },
            { title: "Applies to", dataIndex: "appliesTo", render: (v: string | null) => v ?? "-" },
            { title: "Payout cycle", key: "payoutCycle", render: (_, c) => PAYOUT_CYCLE_LABELS[c.payoutCycle] },
            {
              title: "",
              key: "actions",
              render: (_, c) =>
                canManage &&
                (showArchived ? (
                  <Popconfirm title="Restore this commission arrangement?" onConfirm={() => handleRestore(c.id)}>
                    <Button type="link" size="small">
                      Restore
                    </Button>
                  </Popconfirm>
                ) : (
                  <Popconfirm title="Archive this commission arrangement?" onConfirm={() => handleDelete(c.id)}>
                    <Button type="link" size="small">
                      Archive
                    </Button>
                  </Popconfirm>
                )),
            },
          ]}
        />
      </div>
    </div>
  );
}
