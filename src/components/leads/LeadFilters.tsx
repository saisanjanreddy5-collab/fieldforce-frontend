import { Badge, Button, Popover, Select, Space, Switch, Typography } from "antd";
import { FilterOutlined } from "@ant-design/icons";
import { LEAD_CATEGORY_VALUES, LEAD_STATUS_VALUES } from "../../utils/lead-constants";
import { appTokens } from "../../utils/design-system";

const { Text } = Typography;

export interface AdvancedFilters {
  category?: string;
  status?: string;
  consentPending?: boolean;
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
  const count = activeCount(value);

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
            options={LEAD_CATEGORY_VALUES.map((c) => ({ value: c, label: c }))}
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
            options={LEAD_STATUS_VALUES.map((s) => ({ value: s, label: s }))}
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
    <Popover content={content} trigger="click" placement="bottomRight" styles={{ content: { padding: 16, borderRadius: 12 } }}>
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
