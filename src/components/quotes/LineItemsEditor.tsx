import { Button, Input, InputNumber, Typography } from "antd";
import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import type { QuoteLineItemInput } from "../../types/quote";
import { formatCurrency } from "../../utils/lead-format";
import { appTokens } from "../../utils/design-system";

const { Text } = Typography;

export function emptyLineItem(): QuoteLineItemInput {
  return { description: "", quantity: 1, unitPrice: 0, taxPercent: 18 };
}

export function computeLineTotals(item: QuoteLineItemInput) {
  const lineSubtotal = item.quantity * item.unitPrice;
  const lineTax = lineSubtotal * (item.taxPercent / 100);
  return { lineSubtotal, lineTax, lineTotal: lineSubtotal + lineTax };
}

export function computeQuoteTotals(items: QuoteLineItemInput[]) {
  return items.reduce(
    (acc, item) => {
      const { lineSubtotal, lineTax, lineTotal } = computeLineTotals(item);
      return { subtotal: acc.subtotal + lineSubtotal, taxTotal: acc.taxTotal + lineTax, grandTotal: acc.grandTotal + lineTotal };
    },
    { subtotal: 0, taxTotal: 0, grandTotal: 0 }
  );
}

interface LineItemsEditorProps {
  value: QuoteLineItemInput[];
  onChange: (items: QuoteLineItemInput[]) => void;
}

// The one line-item grid shared by both "new quote" and "edit quote" (which
// always saves as a new version, never an in-place row update) - so the
// editing experience itself never differs depending on whether you're
// creating version 1 or version 6.
export function LineItemsEditor({ value, onChange }: LineItemsEditorProps) {
  const updateItem = (index: number, patch: Partial<QuoteLineItemInput>) => {
    onChange(value.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  };
  const removeItem = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };
  const totals = computeQuoteTotals(value);

  return (
    <div>
      <div
        style={{
          border: `1px solid ${appTokens.border}`,
          borderRadius: appTokens.radius,
          overflow: "hidden",
          background: appTokens.surface,
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 80px 120px 90px 120px 36px",
            gap: 8,
            padding: "10px 14px",
            background: appTokens.surfaceMuted,
            borderBottom: `1px solid ${appTokens.borderLight}`,
          }}
        >
          {["Description", "Qty", "Unit price", "Tax %", "Line total", ""].map((h) => (
            <Text key={h} style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.3, color: appTokens.textTertiary }}>
              {h}
            </Text>
          ))}
        </div>

        {value.map((item, index) => {
          const { lineTotal } = computeLineTotals(item);
          return (
            <div
              key={index}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 80px 120px 90px 120px 36px",
                gap: 8,
                padding: "8px 14px",
                alignItems: "center",
                borderBottom: index === value.length - 1 ? "none" : `1px solid ${appTokens.borderLight}`,
              }}
            >
              <Input
                placeholder="e.g. Franchise setup fee"
                value={item.description}
                onChange={(e) => updateItem(index, { description: e.target.value })}
              />
              <InputNumber min={1} value={item.quantity} onChange={(v) => updateItem(index, { quantity: v ?? 1 })} style={{ width: "100%" }} />
              <InputNumber min={0} prefix="₹" value={item.unitPrice} onChange={(v) => updateItem(index, { unitPrice: v ?? 0 })} style={{ width: "100%" }} />
              <InputNumber min={0} max={100} suffix="%" value={item.taxPercent} onChange={(v) => updateItem(index, { taxPercent: v ?? 0 })} style={{ width: "100%" }} />
              <Text strong style={{ textAlign: "right", color: appTokens.textPrimary }}>
                {formatCurrency(lineTotal)}
              </Text>
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
                disabled={value.length === 1}
                onClick={() => removeItem(index)}
              />
            </div>
          );
        })}
      </div>

      <Button type="dashed" icon={<PlusOutlined />} onClick={() => onChange([...value, emptyLineItem()])} style={{ marginTop: 10 }}>
        Add line item
      </Button>

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
        <div style={{ width: 260, display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <Text style={{ fontSize: 13, color: appTokens.textSecondary }}>Subtotal</Text>
            <Text style={{ fontSize: 13, color: appTokens.textPrimary }}>{formatCurrency(totals.subtotal)}</Text>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <Text style={{ fontSize: 13, color: appTokens.textSecondary }}>Tax</Text>
            <Text style={{ fontSize: 13, color: appTokens.textPrimary }}>{formatCurrency(totals.taxTotal)}</Text>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              paddingTop: 8,
              borderTop: `1px solid ${appTokens.border}`,
            }}
          >
            <Text strong style={{ fontSize: 15, color: appTokens.textPrimary }}>
              Grand total
            </Text>
            <Text strong style={{ fontSize: 15, color: appTokens.primary }}>
              {formatCurrency(totals.grandTotal)}
            </Text>
          </div>
        </div>
      </div>
    </div>
  );
}
