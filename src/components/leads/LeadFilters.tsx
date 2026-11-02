import { useState } from "react";
import { Badge, Button, DatePicker, Popover, Select, Space, Switch, Typography } from "antd";
import { FilterOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { usePipelineStages } from "../../hooks/use-pipeline-stages";
import { useLeadCategories } from "../../hooks/use-lead-categories";
import { useLeadSources } from "../../hooks/use-lead-sources";
import { appTokens } from "../../utils/design-system";

const { Text } = Typography;
const { RangePicker } = DatePicker;

export interface AdvancedFilters {
  category?: string;
  status?: string;
  source?: string;
  consentPending?: boolean;
  // When the lead actually came into the CRM (created_at) - plain calendar
  // dates (YYYY-MM-DD), inclusive on both ends.
  createdFrom?: string;
  createdTo?: string;
}

interface LeadFiltersProps {
  value: AdvancedFilters;
  onChange: (value: AdvancedFilters) => void;
}

const activeCount = (value: AdvancedFilters) => Object.values(value).filter((v) => v !== undefined && v !== false).length;

// Replaces the old always-visible 6-field grid (4 of which were permanently
// disabled). Only real, server-side-filterable fields are offered - Region/
// Territory/Salesperson are gone entirely (Decision 3), not just hidden.
export function LeadFilters({ value, onChange }: LeadFiltersProps) {
  const { stages } = usePipelineStages();
  const { categories } = useLeadCategories();
  const { sources, refetch: refetchSources } = useLeadSources();
  const count = activeCount(value);
  const [open, setOpen] = useState(false);

  const content = (
    <div style={{ width: 260 }}>
      <Text strong style={{ fontSize: 13, display: "block", marginBottom: 12 }}>
        Filter leads
      </Text>
      <Space direction="vertical" size={14} style={{ width: "100%" }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: appTokens.textTertiary, letterSpacing: 0.3, marginBottom: 6 }}>CATEGORY</div>
          <Select
            allowClear
            style={{ width: "100%" }}
            placeholder="All categories"
            value={value.category}
            onChange={(category) => onChange({ ...value, category })}
            options={categories.filter((c) => c.isActive).map((c) => ({ value: c.key, label: c.label }))}
          />
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: appTokens.textTertiary, letterSpacing: 0.3, marginBottom: 6 }}>STAGE</div>
          <Select
            allowClear
            style={{ width: "100%" }}
            placeholder="All stages"
            value={value.status}
            onChange={(status) => onChange({ ...value, status })}
            options={stages.filter((s) => s.isActive).map((s) => ({ value: s.key, label: s.label }))}
          />
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: appTokens.textTertiary, letterSpacing: 0.3, marginBottom: 6 }}>SOURCE</div>
          <Select
            allowClear
            style={{ width: "100%" }}
            placeholder="All sources"
            value={value.source}
            onChange={(source) => onChange({ ...value, source })}
            options={sources.map((s) => ({ value: s, label: s }))}
          />
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: appTokens.textTertiary, letterSpacing: 0.3, marginBottom: 6 }}>DATE CREATED</div>
          <RangePicker
            style={{ width: "100%" }}
            value={[value.createdFrom ? dayjs(value.createdFrom) : null, value.createdTo ? dayjs(value.createdTo) : null]}
            onChange={(dates) =>
              onChange({
                ...value,
                createdFrom: dates?.[0] ? dates[0].format("YYYY-MM-DD") : undefined,
                createdTo: dates?.[1] ? dates[1].format("YYYY-MM-DD") : undefined,
              })
            }
          />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "2px 0" }}>
          <span style={{ fontSize: 13 }}>Consent pending</span>
          <Switch
            size="small"
            checked={value.consentPending ?? false}
            onChange={(consentPending) => onChange({ ...value, consentPending: consentPending || undefined })}
          />
        </div>
        {count > 0 && (
          <Button size="small" block onClick={() => onChange({})}>
            Clear filters
          </Button>
        )}
      </Space>
    </div>
  );

  return (
    <Popover
      content={content}
      trigger="click"
      placement="bottomRight"
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) refetchSources();
      }}
      styles={{ content: { padding: 16, borderRadius: 12 } }}
    >
      <Badge count={count} size="small" offset={[-4, 4]} color={appTokens.primary}>
        <Button
          icon={<FilterOutlined />}
          style={
            count > 0
              ? { borderColor: appTokens.primary, color: appTokens.primary, background: appTokens.primarySoft, fontWeight: 600 }
              : { boxShadow: appTokens.shadowXs }
          }
        >
          Filters
        </Button>
      </Badge>
    </Popover>
  );
}
