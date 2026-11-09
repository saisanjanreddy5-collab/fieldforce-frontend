import { useEffect, useState } from "react";
import { Button, Input, Switch, Typography, message } from "antd";
import * as leadInquiryOptionApi from "../../api/lead-inquiry-option-api";
import type { InquiryOptionFieldType, LeadInquiryOption } from "../../types/lead-inquiry-option";
import { errorMessageFrom } from "../../utils/api-error";
import { appTokens } from "../../utils/design-system";

const { Text } = Typography;

function OptionListCard({
  fieldType,
  title,
  description,
}: {
  fieldType: InquiryOptionFieldType;
  title: string;
  description: string;
}) {
  const [options, setOptions] = useState<LeadInquiryOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [newLabel, setNewLabel] = useState("");
  const [adding, setAdding] = useState(false);

  const load = () => {
    setLoading(true);
    leadInquiryOptionApi
      .listLeadInquiryOptions(fieldType)
      .then(setOptions)
      .catch(() => message.error(`Failed to load ${title.toLowerCase()}`))
      .finally(() => setLoading(false));
  };

  useEffect(load, [fieldType]);

  const handleAdd = async () => {
    const label = newLabel.trim();
    if (!label) return;
    setAdding(true);
    try {
      await leadInquiryOptionApi.createLeadInquiryOption({ fieldType, label });
      setNewLabel("");
      load();
    } catch (err) {
      message.error(errorMessageFrom(err, "Failed to add option"));
    } finally {
      setAdding(false);
    }
  };

  const toggleActive = async (option: LeadInquiryOption) => {
    setOptions((prev) => prev.map((o) => (o.id === option.id ? { ...o, isActive: !o.isActive } : o)));
    try {
      await leadInquiryOptionApi.updateLeadInquiryOption(option.id, { isActive: !option.isActive });
    } catch (err) {
      message.error(errorMessageFrom(err, "Failed to update option"));
      load();
    }
  };

  return (
    <div
      style={{
        border: `1px solid ${appTokens.border}`,
        borderRadius: appTokens.radius,
        background: appTokens.surface,
        boxShadow: appTokens.shadowSm,
      }}
    >
      <div style={{ padding: "14px 18px", borderBottom: `1px solid ${appTokens.borderLight}` }}>
        <Text strong style={{ fontSize: 14 }}>
          {title}
        </Text>
        <div>
          <Text style={{ fontSize: 12.5, color: appTokens.textTertiary }}>{description}</Text>
        </div>
      </div>

      {!loading &&
        options.map((option, idx) => (
          <div
            key={option.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 18,
              padding: "12px 18px",
              borderBottom: idx === options.length - 1 ? "none" : `1px solid ${appTokens.borderLight}`,
            }}
          >
            <Text style={{ fontSize: 13.5, flex: 1 }}>{option.label}</Text>
            <Text style={{ fontSize: 12, color: appTokens.textTertiary }}>{option.isActive ? "Active" : "Inactive"}</Text>
            <Switch checked={option.isActive} onChange={() => toggleActive(option)} />
          </div>
        ))}

      {!loading && options.length === 0 && (
        <div style={{ padding: "14px 18px" }}>
          <Text style={{ fontSize: 13, color: appTokens.textTertiary }}>No options yet - add the first one below.</Text>
        </div>
      )}

      <div style={{ padding: "14px 18px", display: "flex", gap: 8 }}>
        <Input
          placeholder={`Add a new ${title.toLowerCase().replace(/ options$/, "")}`}
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          onPressEnter={handleAdd}
        />
        <Button onClick={handleAdd} loading={adding} disabled={!newLabel.trim()}>
          Add
        </Button>
      </div>
    </div>
  );
}

export function InquiryOptionsTab() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Text style={{ fontSize: 12.5, color: appTokens.textTertiary }}>
        These back the Lead form's Inquiry Category/Source dropdowns for manually-entered leads. QR and Website leads fill these in
        automatically from the real campaign/form name and are not affected by this list.
      </Text>
      <OptionListCard
        fieldType="category"
        title="Inquiry Category options"
        description="The general bucket for how the lead reached out"
      />
      <OptionListCard
        fieldType="source"
        title="Inquiry Source options"
        description="The specific channel or platform the lead came from"
      />
    </div>
  );
}
