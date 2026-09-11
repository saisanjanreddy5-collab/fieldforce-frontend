import { Button, Select } from "antd";

export interface AdvancedFilters {
  category?: string;
  status?: string;
}

interface FiltersPanelProps {
  categories: string[];
  statuses: string[];
  value: AdvancedFilters;
  onChange: (value: AdvancedFilters) => void;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: "#898781", marginBottom: 4 }}>{label}</div>
      {children}
    </div>
  );
}

// Region / Territory / Salesperson / Created are UI-only placeholders for
// now - we don't have geography seed data or a users-list endpoint yet, so
// there's nothing real to filter by. Category and Stage (status) are wired
// to real lead data since we already have that.
//
// Uses a container-width CSS grid (auto-fit/minmax) rather than antd's
// Row/Col, since Col's breakpoints respond to the viewport, not to this
// panel's actual container - which is a narrow ~380px sidebar here, not
// the full page width.
export function FiltersPanel({ categories, statuses, value, onChange }: FiltersPanelProps) {
  return (
    <div style={{ border: "1px solid #f0f0f0", borderRadius: 8, padding: 12, marginBottom: 12 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 12 }}>
        <Field label="REGION">
          <Select disabled style={{ width: "100%" }} placeholder="All regions" />
        </Field>
        <Field label="TERRITORY">
          <Select disabled style={{ width: "100%" }} placeholder="All territories" />
        </Field>
        <Field label="SALESPERSON">
          <Select disabled style={{ width: "100%" }} placeholder="All salespersons" />
        </Field>
        <Field label="CATEGORY">
          <Select
            allowClear
            style={{ width: "100%" }}
            placeholder="All categories"
            value={value.category}
            onChange={(category) => onChange({ ...value, category })}
            options={categories.map((c) => ({ value: c, label: c }))}
          />
        </Field>
        <Field label="STAGE">
          <Select
            allowClear
            style={{ width: "100%" }}
            placeholder="All stages"
            value={value.status}
            onChange={(status) => onChange({ ...value, status })}
            options={statuses.map((s) => ({ value: s, label: s }))}
          />
        </Field>
        <Field label="CREATED">
          <Select disabled style={{ width: "100%" }} placeholder="Last 30 days" />
        </Field>
      </div>
      <Button size="small" style={{ marginTop: 12 }} onClick={() => onChange({})}>
        Clear
      </Button>
    </div>
  );
}
