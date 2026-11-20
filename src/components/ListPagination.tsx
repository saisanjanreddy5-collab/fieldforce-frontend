import { Button, Select, Typography } from "antd";
import { LeftOutlined, RightOutlined } from "@ant-design/icons";
import { appTokens } from "../utils/design-system";

const { Text } = Typography;

export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

interface ListPaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onChange: (page: number, pageSize: number) => void;
  /** Rows-per-page choices; defaults to 10 / 20 / 50 / 100. */
  pageSizeOptions?: number[];
  /** Narrow columns (e.g. the Leads list rail): shorter wording, no "Rows / Page" label. */
  compact?: boolean;
}

const formatCount = (n: number) => n.toLocaleString("en-IN");

// The one pager for every list in the app: "Showing 1 - 10 of 4,019" on the
// left; rows-per-page, then previous / next on the right.
export function ListPagination({ page, pageSize, total, onChange, pageSizeOptions = PAGE_SIZE_OPTIONS, compact = false }: ListPaginationProps) {
  if (total <= 0) return null;
  const lastPage = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(Math.max(page, 1), lastPage);
  const from = (current - 1) * pageSize + 1;
  const to = Math.min(current * pageSize, total);
  const options = pageSizeOptions.includes(pageSize) ? pageSizeOptions : [...pageSizeOptions, pageSize].sort((a, b) => a - b);
  const arrowStyle = { width: 32, height: 32, borderRadius: appTokens.radiusSm, borderColor: appTokens.borderLight };

  return (
    <nav
      aria-label="Pagination"
      style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", width: "100%" }}
    >
      <Text style={{ fontSize: 13, color: appTokens.textSecondary, whiteSpace: "nowrap" }}>
        {compact ? "" : "Showing "}
        {formatCount(from)} - {formatCount(to)} of {formatCount(total)}
      </Text>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Select
          size="middle"
          value={pageSize}
          onChange={(size: number) => onChange(1, size)}
          options={options.map((n) => ({ value: n, label: String(n) }))}
          style={{ width: 72 }}
          aria-label="Rows per page"
        />
        {!compact && <Text style={{ fontSize: 13, color: appTokens.textSecondary, whiteSpace: "nowrap" }}>Rows / Page</Text>}
        <Button
          icon={<LeftOutlined />}
          disabled={current <= 1}
          onClick={() => onChange(current - 1, pageSize)}
          aria-label="Previous page"
          style={arrowStyle}
        />
        <Button
          icon={<RightOutlined />}
          disabled={current >= lastPage}
          onClick={() => onChange(current + 1, pageSize)}
          aria-label="Next page"
          style={arrowStyle}
        />
      </div>
    </nav>
  );
}
