import { useEffect, useMemo, useState } from "react";
import { Button, DatePicker, Input, Modal, Popconfirm, Select, Space, Spin, Typography, message } from "antd";
import { BarChartOutlined } from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";
import * as reportApi from "../api/report-api";
import * as salesTeamApi from "../api/sales-team-api";
import type { Zone } from "../types/sales-team";
import type {
  B2BGroupRow,
  FofoCohortRow,
  LeadSourceRoiRow,
  SalespersonPerformanceRow,
  SavedReportView,
  StateWiseRow,
} from "../types/report";
import { useHasPermission } from "../hooks/use-permission";
import { formatCompactCurrency } from "../utils/lead-format";
import { exportToXlsx } from "../utils/export-xlsx";
import { appTokens } from "../utils/design-system";

const { Title, Text } = Typography;

type ReportKey = "salesperson" | "state_wise" | "b2b_group" | "lead_source_roi" | "fofo_cohort_retention";

const REPORT_TABS: { key: ReportKey; label: string }[] = [
  { key: "salesperson", label: "Salesperson" },
  { key: "state_wise", label: "State-wise" },
  { key: "b2b_group", label: "B2B group" },
  { key: "lead_source_roi", label: "Lead source ROI" },
  { key: "fofo_cohort_retention", label: "Cohort retention" },
];

const money = (v: number | null) => (v === null ? "-" : formatCompactCurrency(v));

interface ReportColumn<T> {
  key: string;
  label: string;
  align?: "left" | "right";
  flex?: number;
  render: (row: T) => React.ReactNode;
}

function ReportTable<T>({
  columns,
  rows,
  rowKey,
  totalRow,
  emptyText,
  loading,
}: {
  columns: ReportColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  totalRow?: React.ReactNode[];
  emptyText: string;
  loading: boolean;
}) {
  return (
    <div style={{ border: `1px solid ${appTokens.border}`, borderRadius: appTokens.radius, overflow: "hidden" }}>
      <div style={{ display: "flex", padding: "10px 18px", background: appTokens.surfaceMuted, borderBottom: `1px solid ${appTokens.borderLight}` }}>
        {columns.map((c) => (
          <div
            key={c.key}
            style={{
              flex: c.flex ?? 1,
              textAlign: c.align ?? "left",
              fontSize: 10.5,
              fontWeight: 700,
              letterSpacing: 0.5,
              color: appTokens.textTertiary,
              textTransform: "uppercase",
            }}
          >
            {c.label}
          </div>
        ))}
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: "center" }}>
          <Spin />
        </div>
      ) : rows.length === 0 ? (
        <div style={{ padding: "40px 18px", textAlign: "center" }}>
          <BarChartOutlined style={{ fontSize: 22, color: appTokens.textTertiary }} />
          <div style={{ marginTop: 8 }}>
            <Text style={{ fontSize: 13, color: appTokens.textTertiary }}>{emptyText}</Text>
          </div>
        </div>
      ) : (
        rows.map((row, idx) => (
          <div
            key={rowKey(row)}
            style={{
              display: "flex",
              padding: "13px 18px",
              borderBottom: idx === rows.length - 1 && !totalRow ? "none" : `1px solid ${appTokens.borderLight}`,
              transition: "background 0.1s",
            }}
          >
            {columns.map((c) => (
              <div key={c.key} style={{ flex: c.flex ?? 1, textAlign: c.align ?? "left", fontSize: 13.5, color: appTokens.textPrimary }}>
                {c.render(row)}
              </div>
            ))}
          </div>
        ))
      )}

      {totalRow && rows.length > 0 && (
        <div style={{ display: "flex", padding: "13px 18px", background: appTokens.surfaceMuted, borderTop: `1.5px solid ${appTokens.border}` }}>
          {columns.map((c, i) => (
            <div key={c.key} style={{ flex: c.flex ?? 1, textAlign: c.align ?? "left", fontSize: 13.5, fontWeight: 700, color: appTokens.textPrimary }}>
              {totalRow[i]}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ReportCard({ title, sub, right, children }: { title: string; sub: React.ReactNode; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ border: `1px solid ${appTokens.border}`, borderRadius: appTokens.radius, background: appTokens.surface, boxShadow: appTokens.shadowSm }}>
      <div
        style={{
          padding: "14px 18px",
          borderBottom: `1px solid ${appTokens.borderLight}`,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <Text strong style={{ fontSize: 14 }}>
            {title}
          </Text>
          <div>
            <Text style={{ fontSize: 12.5, color: appTokens.textTertiary }}>{sub}</Text>
          </div>
        </div>
        {right}
      </div>
      <div style={{ padding: 18 }}>{children}</div>
    </div>
  );
}

export default function ReportsPage() {
  const hasPermission = useHasPermission();
  const [tab, setTab] = useState<ReportKey>("salesperson");
  const [month, setMonth] = useState<Dayjs | null>(null);
  const [zoneId, setZoneId] = useState<string | undefined>(undefined);
  const [zones, setZones] = useState<Zone[]>([]);

  const [salesperson, setSalesperson] = useState<SalespersonPerformanceRow[]>([]);
  const [stateWise, setStateWise] = useState<StateWiseRow[]>([]);
  const [b2bGroup, setB2bGroup] = useState<B2BGroupRow[]>([]);
  const [leadSource, setLeadSource] = useState<LeadSourceRoiRow[]>([]);
  const [cohort, setCohort] = useState<FofoCohortRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [savedViewOpen, setSavedViewOpen] = useState(false);
  const [savedViewName, setSavedViewName] = useState("");
  const [savedViews, setSavedViews] = useState<SavedReportView[]>([]);

  useEffect(() => {
    salesTeamApi.listZones().then(setZones).catch(() => undefined);
  }, []);

  const loadSalesperson = () => {
    setLoading(true);
    reportApi
      .getSalespersonPerformance({ month: month ? month.format("YYYY-MM") : undefined, zoneId })
      .then(setSalesperson)
      .catch(() => message.error("Failed to load report"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (tab !== "salesperson") return;
    loadSalesperson();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, month, zoneId]);

  useEffect(() => {
    if (tab === "state_wise") {
      setLoading(true);
      reportApi.getStateWise().then(setStateWise).catch(() => message.error("Failed to load report")).finally(() => setLoading(false));
    } else if (tab === "b2b_group") {
      setLoading(true);
      reportApi.getB2BGroup().then(setB2bGroup).catch(() => message.error("Failed to load report")).finally(() => setLoading(false));
    } else if (tab === "lead_source_roi") {
      setLoading(true);
      reportApi.getLeadSourceRoi().then(setLeadSource).catch(() => message.error("Failed to load report")).finally(() => setLoading(false));
    } else if (tab === "fofo_cohort_retention") {
      setLoading(true);
      reportApi
        .getFofoCohortRetention()
        .then(setCohort)
        .catch(() => message.error("Failed to load report"))
        .finally(() => setLoading(false));
    }
  }, [tab]);

  useEffect(() => {
    if (!savedViewOpen) return;
    reportApi.listSavedViews(tab).then(setSavedViews).catch(() => undefined);
  }, [savedViewOpen, tab]);

  const canSaveView = hasPermission("reports.save_view");

  const handleSaveView = async () => {
    if (!savedViewName.trim()) return;
    try {
      const filters = tab === "salesperson" ? { month: month?.format("YYYY-MM"), zoneId } : {};
      await reportApi.createSavedView(tab, savedViewName.trim(), filters);
      message.success("View saved");
      setSavedViewName("");
      reportApi.listSavedViews(tab).then(setSavedViews);
    } catch {
      message.error("Failed to save view");
    }
  };

  const handleLoadView = (view: SavedReportView) => {
    if (view.reportKey !== "salesperson") return;
    const filters = view.filters as { month?: string; zoneId?: string };
    setMonth(filters.month ? dayjs(filters.month) : null);
    setZoneId(filters.zoneId);
    setSavedViewOpen(false);
  };

  const handleDeleteView = async (id: string) => {
    await reportApi.deleteSavedView(id);
    setSavedViews((prev) => prev.filter((v) => v.id !== id));
  };

  const handleExport = async () => {
    if (tab === "salesperson") {
      await exportToXlsx(
        "Salesperson performance",
        [
          { header: "Salesperson", key: "name" },
          { header: "Leads", key: "leads" },
          { header: "Converted", key: "converted" },
          { header: "Conv. %", key: "conversionRate" },
          { header: "Revenue", key: "revenue" },
        ],
        salesperson.map((r) => ({ ...r })),
        "salesperson-performance"
      );
    } else if (tab === "state_wise") {
      await exportToXlsx(
        "State-wise",
        [
          { header: "State", key: "stateName" },
          { header: "Leads", key: "leads" },
          { header: "Customers", key: "customers" },
          { header: "FOFO live", key: "fofoLive" },
          { header: "Open tickets", key: "openTickets" },
        ],
        stateWise.map((r) => ({ ...r, openTickets: r.openTickets ?? "-" })),
        "state-wise-leads-and-customers"
      );
    } else if (tab === "b2b_group") {
      await exportToXlsx(
        "B2B group",
        [
          { header: "Category", key: "category" },
          { header: "Accounts", key: "accounts" },
          { header: "Revenue", key: "revenue" },
          { header: "Avg order", key: "avgOrder" },
          { header: "Overdue", key: "overdue" },
        ],
        b2bGroup.map((r) => ({ ...r, avgOrder: r.avgOrder ?? "-", overdue: r.overdue ?? "-" })),
        "b2b-group-performance"
      );
    } else if (tab === "lead_source_roi") {
      await exportToXlsx(
        "Lead source ROI",
        [
          { header: "Source", key: "source" },
          { header: "Leads", key: "leads" },
          { header: "Qualified", key: "qualified" },
          { header: "Cost", key: "cost" },
          { header: "CPQL", key: "cpql" },
        ],
        leadSource.map((r) => ({ ...r, cost: r.cost ?? "-", cpql: r.cpql ?? "-" })),
        "lead-source-roi"
      );
    } else {
      await exportToXlsx(
        "FOFO cohort retention",
        [
          { header: "Cohort", key: "cohortMonth" },
          { header: "Stores", key: "stores" },
          { header: "M+3", key: "m3" },
          { header: "M+6", key: "m6" },
          { header: "M+12", key: "m12" },
        ],
        cohort.map((r) => ({
          ...r,
          cohortMonth: dayjs(r.cohortMonth).format("MMM YYYY"),
          m3: r.m3 ?? "-",
          m6: r.m6 ?? "-",
          m12: r.m12 ?? "-",
        })),
        "fofo-cohort-retention"
      );
    }
  };

  const caption = useMemo(() => {
    if (tab !== "salesperson") return undefined;
    const parts = [month ? month.format("MMM YYYY") : "All time", zoneId ? zones.find((z) => z.id === zoneId)?.name : "All regions"];
    return `${parts.filter(Boolean).join(" · ")} · leads, conversion and revenue`;
  }, [tab, month, zoneId, zones]);

  if (!hasPermission("reports.view")) {
    return (
      <div>
        <Title level={3}>Reports</Title>
        <Text type="secondary">You do not have permission to view reports.</Text>
      </div>
    );
  }

  const salespersonTotals = salesperson.reduce(
    (acc, r) => ({ leads: acc.leads + r.leads, converted: acc.converted + r.converted, revenue: acc.revenue + r.revenue }),
    { leads: 0, converted: 0, revenue: 0 }
  );

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
        <div>
          <Title level={3} style={{ margin: 0, letterSpacing: -0.3, color: appTokens.textPrimary }}>
            Reports
          </Title>
          <Text style={{ color: appTokens.textSecondary, fontSize: 13.5 }}>Group, drill down and save as a shared view for the team.</Text>
        </div>
        <Space>
          {canSaveView && <Button onClick={() => setSavedViewOpen(true)}>Save view</Button>}
          <Button type="primary" onClick={handleExport}>
            Export XLSX
          </Button>
        </Space>
      </div>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
        {REPORT_TABS.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              style={{
                padding: "5px 12px",
                fontSize: 12.5,
                fontFamily: appTokens.font,
                fontWeight: active ? 600 : 500,
                borderRadius: 999,
                border: `1px solid ${active ? appTokens.primary : appTokens.border}`,
                background: active ? appTokens.primarySoft : appTokens.surface,
                color: active ? appTokens.primary : appTokens.textPrimary,
                cursor: "pointer",
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "salesperson" && (
        <ReportCard
          title="Performance by salesperson"
          sub={caption}
          right={
            <Space>
              <DatePicker picker="month" placeholder="All time" value={month} onChange={setMonth} allowClear />
              <Select
                placeholder="All regions"
                allowClear
                style={{ width: 160 }}
                value={zoneId}
                onChange={setZoneId}
                options={zones.map((z) => ({ value: z.id, label: z.name }))}
              />
            </Space>
          }
        >
          <ReportTable<SalespersonPerformanceRow>
            loading={loading}
            rows={salesperson}
            rowKey={(r) => r.userId}
            emptyText="No leads owned by anyone in your reporting line yet"
            columns={[
              { key: "name", label: "Salesperson", flex: 1.4, render: (r) => <Text strong>{r.name}</Text> },
              { key: "leads", label: "Leads", align: "right", render: (r) => r.leads },
              { key: "converted", label: "Converted", align: "right", render: (r) => r.converted },
              { key: "rate", label: "Conv. %", align: "right", render: (r) => `${r.conversionRate}%` },
              { key: "revenue", label: "Revenue", align: "right", render: (r) => <Text strong>{money(r.revenue)}</Text> },
            ]}
            totalRow={[
              <Text strong key="l">
                Total
              </Text>,
              <Text strong key="le" style={{ display: "block", textAlign: "right" }}>
                {salespersonTotals.leads}
              </Text>,
              <Text strong key="c" style={{ display: "block", textAlign: "right" }}>
                {salespersonTotals.converted}
              </Text>,
              <Text strong key="r" style={{ display: "block", textAlign: "right" }}>
                {salespersonTotals.leads === 0 ? 0 : Math.round((salespersonTotals.converted / salespersonTotals.leads) * 1000) / 10}%
              </Text>,
              <Text strong key="rev" style={{ display: "block", textAlign: "right" }}>
                {money(salespersonTotals.revenue)}
              </Text>,
            ]}
          />
        </ReportCard>
      )}

      {tab === "state_wise" && (
        <ReportCard title="State-wise leads and customers" sub={'"Open tickets" is shown as "-" - FieldForce has no support-ticket system yet.'}>
          <ReportTable<StateWiseRow>
            loading={loading}
            rows={stateWise}
            rowKey={(r) => r.stateId}
            emptyText="No leads have a State assigned yet - set Region/State on a lead to see it here"
            columns={[
              { key: "state", label: "State", flex: 1.4, render: (r) => <Text strong>{r.stateName}</Text> },
              { key: "leads", label: "Leads", align: "right", render: (r) => r.leads },
              { key: "customers", label: "Customers", align: "right", render: (r) => r.customers },
              { key: "fofo", label: "FOFO live", align: "right", render: (r) => r.fofoLive },
              { key: "tickets", label: "Open tickets", align: "right", render: (r) => r.openTickets ?? "-" },
            ]}
          />
        </ReportCard>
      )}

      {tab === "b2b_group" && (
        <ReportCard
          title="B2B group performance"
          sub='Non-FOFO channel mix, current data. "Avg order" and "Overdue" are shown as "-" - no orders/billing system exists yet.'
        >
          <ReportTable<B2BGroupRow>
            loading={loading}
            rows={b2bGroup}
            rowKey={(r) => r.category}
            emptyText="No non-FOFO leads yet - this report excludes FOFO, which has its own Cohort retention report"
            columns={[
              { key: "category", label: "Category", flex: 1.4, render: (r) => <Text strong>{r.category}</Text> },
              { key: "accounts", label: "Accounts", align: "right", render: (r) => r.accounts },
              { key: "revenue", label: "Revenue", align: "right", render: (r) => <Text strong>{money(r.revenue)}</Text> },
              { key: "avgOrder", label: "Avg order", align: "right", render: (r) => money(r.avgOrder) },
              { key: "overdue", label: "Overdue", align: "right", render: (r) => money(r.overdue) },
            ]}
          />
        </ReportCard>
      )}

      {tab === "lead_source_roi" && (
        <ReportCard
          title="Lead source ROI"
          sub='Grouped by the inquiry source salespeople actually record. "Cost" and "CPQL" are shown as "-" - no marketing spend is tracked yet.'
        >
          <ReportTable<LeadSourceRoiRow>
            loading={loading}
            rows={leadSource}
            rowKey={(r) => r.source}
            emptyText="No leads with an inquiry source recorded yet"
            columns={[
              { key: "source", label: "Source", flex: 1.4, render: (r) => <Text strong>{r.source}</Text> },
              { key: "leads", label: "Leads", align: "right", render: (r) => r.leads },
              { key: "qualified", label: "Qualified", align: "right", render: (r) => r.qualified },
              { key: "cost", label: "Cost", align: "right", render: (r) => money(r.cost) },
              { key: "cpql", label: "CPQL", align: "right", render: (r) => money(r.cpql) },
            ]}
          />
        </ReportCard>
      )}

      {tab === "fofo_cohort_retention" && (
        <ReportCard
          title="FOFO cohort retention"
          sub={`Cohort and store count are real (grouped by when each store actually went live). M+3/M+6/M+12 are shown as "-" - FieldForce has no recurring-order tracking, so ongoing retention can't be measured yet.`}
        >
          <ReportTable<FofoCohortRow>
            loading={loading}
            rows={cohort}
            rowKey={(r) => r.cohortMonth}
            emptyText="No FOFO stores have gone live yet"
            columns={[
              { key: "cohort", label: "Cohort", flex: 1.4, render: (r) => <Text strong>{dayjs(r.cohortMonth).format("MMM YYYY")}</Text> },
              { key: "stores", label: "Stores", align: "right", render: (r) => r.stores },
              { key: "m3", label: "M+3", align: "right", render: (r) => (r.m3 === null ? "-" : `${r.m3}%`) },
              { key: "m6", label: "M+6", align: "right", render: (r) => (r.m6 === null ? "-" : `${r.m6}%`) },
              { key: "m12", label: "M+12", align: "right", render: (r) => (r.m12 === null ? "-" : `${r.m12}%`) },
            ]}
          />
        </ReportCard>
      )}

      <Modal
        title="Save view"
        open={savedViewOpen}
        onCancel={() => setSavedViewOpen(false)}
        footer={
          <Space>
            <Button onClick={() => setSavedViewOpen(false)}>Close</Button>
            <Button type="primary" onClick={handleSaveView} disabled={!savedViewName.trim()}>
              Save current filters
            </Button>
          </Space>
        }
      >
        <Input
          placeholder="Name this view"
          value={savedViewName}
          onChange={(e) => setSavedViewName(e.target.value)}
          style={{ marginBottom: 12 }}
        />
        {savedViews.length > 0 && (
          <div>
            <Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 6 }}>
              Saved views for this report
            </Text>
            {savedViews.map((v) => (
              <div key={v.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0" }}>
                <Button type="link" style={{ padding: 0 }} onClick={() => handleLoadView(v)}>
                  {v.name}
                </Button>
                <Popconfirm title="Remove this saved view?" onConfirm={() => handleDeleteView(v.id)}>
                  <Button type="link" danger size="small">
                    Remove
                  </Button>
                </Popconfirm>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}
