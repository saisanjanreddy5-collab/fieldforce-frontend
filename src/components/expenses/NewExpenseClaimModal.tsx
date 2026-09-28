import { useEffect, useState } from "react";
import { Button, DatePicker, Input, Modal, Select, Typography, Upload, message } from "antd";
import { PaperClipOutlined, UploadOutlined } from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";
import * as expenseApi from "../../api/expense-api";
import * as opportunityApi from "../../api/opportunity-api";
import type { ExpenseType, ExpenseTypeKey } from "../../types/expense";
import type { Opportunity } from "../../types/opportunity";
import { errorMessageFrom } from "../../utils/api-error";
import { limitUnitSuffix } from "../../utils/expense-format";
import { EXPENSE_TYPE_ICON } from "../../utils/expense-icons";
import { appTokens } from "../../utils/design-system";

const { Text, Title } = Typography;

const TYPE_ROWS: ExpenseTypeKey[][] = [
  ["travel", "fuel", "lodging", "meals", "client_entertainment"],
  ["telecom", "marketing_collateral"],
];

// fuel/lodging/meals scale with a quantity (₹/km, ₹/night, ₹/day) - the
// other four are a flat cap per claim, so the quantity field is only
// meaningful (and required) for these three.
const QUANTITY_KINDS: ExpenseTypeKey[] = ["fuel", "lodging", "meals"];
const QUANTITY_LABEL: Record<string, string> = { fuel: "Distance (km)", lodging: "Nights", meals: "Days" };

interface NewExpenseClaimModalProps {
  open: boolean;
  onClose: () => void;
  onSubmitted: () => void;
  types: ExpenseType[];
  managerName: string | null;
  initialTypeKey?: ExpenseTypeKey;
}

export function NewExpenseClaimModal({ open, onClose, onSubmitted, types, managerName, initialTypeKey }: NewExpenseClaimModalProps) {
  const [typeKey, setTypeKey] = useState<ExpenseTypeKey>("travel");
  const [title, setTitle] = useState("");
  const [expenseDate, setExpenseDate] = useState<Dayjs | null>(dayjs());
  const [amount, setAmount] = useState("");
  const [quantity, setQuantity] = useState("");
  const [linkedOpportunityId, setLinkedOpportunityId] = useState<string | undefined>();
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTypeKey(initialTypeKey ?? "travel");
    setTitle("");
    setExpenseDate(dayjs());
    setAmount("");
    setQuantity("");
    setLinkedOpportunityId(undefined);
    setReceiptFile(null);
    opportunityApi.listOpportunities({}).then(setOpportunities).catch(() => undefined);
  }, [open]);

  const type = types.find((t) => t.key === typeKey);
  const needsQuantity = QUANTITY_KINDS.includes(typeKey);

  const canSubmit =
    title.trim().length > 0 &&
    expenseDate !== null &&
    Number(amount) > 0 &&
    (!needsQuantity || Number(quantity) > 0) &&
    (!type?.requiresLinkedOpportunity || linkedOpportunityId) &&
    (!type?.receiptRequired || receiptFile !== null);

  const handleSubmit = async () => {
    if (!expenseDate || !type) return;
    setSubmitting(true);
    try {
      await expenseApi.createExpenseClaim({
        expenseTypeKey: typeKey,
        title: title.trim(),
        expenseDate: expenseDate.format("YYYY-MM-DD"),
        amount: Number(amount),
        quantity: needsQuantity ? Number(quantity) : undefined,
        linkedOpportunityId,
        receipt: receiptFile ?? undefined,
      });
      message.success("Expense claim submitted");
      onSubmitted();
    } catch (err) {
      message.error(errorMessageFrom(err, "Failed to submit expense claim"));
    } finally {
      setSubmitting(false);
    }
  };

  const pill = (key: ExpenseTypeKey) => {
    const t = types.find((x) => x.key === key);
    const active = typeKey === key;
    return (
      <button
        key={key}
        type="button"
        onClick={() => setTypeKey(key)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "6px 12px",
          fontSize: 13,
          fontFamily: appTokens.font,
          fontWeight: active ? 600 : 500,
          borderRadius: 999,
          border: `1px solid ${active ? (t?.color ?? appTokens.primary) : appTokens.border}`,
          background: appTokens.surface,
          color: active ? (t?.color ?? appTokens.primary) : appTokens.textPrimary,
          cursor: "pointer",
        }}
      >
        {EXPENSE_TYPE_ICON[key]}
        {t?.label ?? key}
      </button>
    );
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      width={580}
      footer={null}
      title={
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: appTokens.radiusSm,
              background: appTokens.primarySoft,
              color: appTokens.primary,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              fontWeight: 700,
            }}
          >
            ₹
          </div>
          <div>
            <Title level={5} style={{ margin: 0 }}>
              New expense claim
            </Title>
            <Text style={{ fontSize: 12, color: appTokens.textTertiary }}>Policy limits are checked as you file</Text>
          </div>
        </div>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8, marginBottom: 16 }}>
        {TYPE_ROWS.map((row, idx) => (
          <div key={idx} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {row.map(pill)}
          </div>
        ))}
      </div>

      <div>
        <Text style={{ fontSize: 12.5, fontWeight: 500 }}>
          What was it for <span style={{ color: appTokens.danger }}>*</span>
        </Text>
        <Input style={{ marginTop: 4 }} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Nashik site visits - 3 days" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
        <div>
          <Text style={{ fontSize: 12.5, fontWeight: 500 }}>
            Date of expense <span style={{ color: appTokens.danger }}>*</span>
          </Text>
          <DatePicker style={{ width: "100%", marginTop: 4 }} value={expenseDate} onChange={setExpenseDate} disabledDate={(d) => d.isAfter(dayjs(), "day")} />
        </div>
        <div>
          <Text style={{ fontSize: 12.5, fontWeight: 500 }}>
            Amount <span style={{ color: appTokens.danger }}>*</span>
          </Text>
          <Input style={{ marginTop: 4 }} prefix="₹" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))} placeholder="0" />
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        <Text style={{ fontSize: 12.5, fontWeight: 500 }}>
          Link to opportunity {type?.requiresLinkedOpportunity && <span style={{ color: appTokens.danger }}>*</span>}
        </Text>
        <Select
          style={{ width: "100%", marginTop: 4 }}
          allowClear
          showSearch
          optionFilterProp="label"
          placeholder="Select an opportunity (optional)"
          value={linkedOpportunityId}
          onChange={setLinkedOpportunityId}
          options={opportunities.map((o) => ({ value: o.id, label: o.name ?? o.leadFullName ?? "Untitled" }))}
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
        <div>
          <Text style={{ fontSize: 12.5, fontWeight: 500 }}>
            {needsQuantity ? QUANTITY_LABEL[typeKey] : "Distance / nights / count"}
            {needsQuantity && <span style={{ color: appTokens.danger }}> *</span>}
          </Text>
          <Input
            style={{ marginTop: 4 }}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value.replace(/[^0-9.]/g, ""))}
            placeholder={needsQuantity ? "0" : "-"}
            disabled={!needsQuantity}
          />
        </div>
        <div>
          <Text style={{ fontSize: 12.5, fontWeight: 500 }}>Approver</Text>
          <Input style={{ marginTop: 4 }} value={managerName ? `${managerName} (reporting manager)` : "None - top of org, auto-approved"} disabled />
        </div>
      </div>

      {type && (
        <div
          style={{
            marginTop: 16,
            padding: "10px 14px",
            borderRadius: appTokens.radiusSm,
            background: appTokens.primarySoft,
            border: `1px solid ${appTokens.primarySoftBorder}`,
          }}
        >
          <Text strong style={{ fontSize: 12.5, color: appTokens.primary, display: "block" }}>
            Policy for {type.label}
          </Text>
          <Text style={{ fontSize: 12, color: appTokens.textSecondary }}>
            ₹{type.limitAmount.toLocaleString("en-IN")} {limitUnitSuffix(type.limitUnit)} · {type.policyNote} ·{" "}
            {type.receiptRequired ? "receipt required" : "no receipt needed"}
          </Text>
        </div>
      )}

      {type?.receiptRequired && (
        <div
          style={{
            marginTop: 12,
            padding: "14px",
            borderRadius: appTokens.radiusSm,
            border: `1px dashed ${appTokens.border}`,
            textAlign: "center",
          }}
        >
          <Upload
            showUploadList={false}
            beforeUpload={(file) => {
              setReceiptFile(file);
              return false;
            }}
            accept="image/jpeg,image/png,image/webp,application/pdf"
          >
            <Button icon={receiptFile ? <PaperClipOutlined /> : <UploadOutlined />} type={receiptFile ? "default" : "text"}>
              {receiptFile ? receiptFile.name : "Attach the receipt"}
            </Button>
          </Upload>
          <Text style={{ fontSize: 11, color: appTokens.textTertiary, display: "block", marginTop: 4 }}>
            Photo or PDF - required for this expense type
          </Text>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 20 }}>
        <Text style={{ fontSize: 11.5, color: appTokens.textTertiary }}>Goes to your reporting manager, then finance for payout</Text>
        <div style={{ display: "flex", gap: 8 }}>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="primary" loading={submitting} disabled={!canSubmit} onClick={handleSubmit}>
            Submit claim
          </Button>
        </div>
      </div>
    </Modal>
  );
}
