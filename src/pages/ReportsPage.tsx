import { useEffect, useMemo, useState } from "react";
import {
  Button,
  DatePicker,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Typography,
  message,
} from "antd";
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

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
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

      <div style={{ display: "flex", gap: 6, overflowX: "auto", margin: "16px 0" }}>
        {REPORT_TABS.map((t) => {
          const active = tab === t.key;
          return (
            <Button
              key={t.key}
              size="small"
              shape="round"
              onClick={() => setTab(t.key)}
              style={{
                flexShrink: 0,
                background: active ? appTokens.primarySoft : "transparent",
                borderColor: active ? appTokens.primary : appTokens.border,
                color: active ? appTokens.primary : appTokens.textPrimary,
                fontWeight: active ? 700 : 500,
              }}
            >
              {t.label}
            </Button>
          );
        })}
      </div>

      <div
        style={{
          border: `1px solid ${appTokens.border}`,
          borderRadius: appTokens.radius,
          padding: 18,
          background: appTokens.surface,
          boxShadow: appTokens.shadowXs,
        }}
      >
        {tab === "salesperson" && (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
              <div>
                <Text strong style={{ display: "block" }}>
                  Performance by salesperson
                </Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {caption}
                </Text>
              </div>
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
            </div>
            <Table<SalespersonPerformanceRow>
              className="thin-scroll-table"
              size="small"
              rowKey="userId"
              loading={loading}
              dataSource={salesperson}
              pagination={false}
              columns={[
                { title: "Salesperson", dataIndex: "name" },
                { title: "Leads", dataIndex: "leads" },
                { title: "Converted", dataIndex: "converted" },
                { title: "Conv. %", dataIndex: "conversionRate", render: (v: number) => `${v}%` },
                { title: "Revenue", dataIndex: "revenue", render: (v: number) => money(v) },
              ]}
              summary={(rows) => {
                const leads = rows.reduce((s, r) => s + r.leads, 0);
                const converted = rows.reduce((s, r) => s + r.converted, 0);
                const revenue = rows.reduce((s, r) => s + r.revenue, 0);
                return (
                  <Table.Summary.Row>
                    <Table.Summary.Cell index={0}>
                      <Text strong>Total</Text>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={1}>
                      <Text strong>{leads}</Text>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={2}>
                      <Text strong>{converted}</Text>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={3}>
                      <Text strong>{leads === 0 ? 0 : Math.round((converted / leads) * 1000) / 10}%</Text>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={4}>
                      <Text strong>{money(revenue)}</Text>
                    </Table.Summary.Cell>
                  </Table.Summary.Row>
                );
              }}
            />
          </>
        )}

        {tab === "state_wise" && (
          <>
            <Text strong style={{ display: "block" }}>
              State-wise leads and customers
            </Text>
            <Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 12 }}>
              "Open tickets" is shown as "-" - FieldForce has no support-ticket system yet.
            </Text>
            <Table<StateWiseRow>
              className="thin-scroll-table"
              size="small"
              rowKey="stateId"
              loading={loading}
              dataSource={stateWise}
              pagination={false}
              locale={{ emptyText: "No leads have a State assigned yet - set Region/State on a lead to see it here" }}
              columns={[
                { title: "State", dataIndex: "stateName" },
                { title: "Leads", dataIndex: "leads" },
                { title: "Customers", dataIndex: "customers" },
                { title: "FOFO live", dataIndex: "fofoLive" },
                { title: "Open tickets", dataIndex: "openTickets", render: (v: number | null) => v ?? "-" },
              ]}
            />
          </>
        )}

        {tab === "b2b_group" && (
          <>
            <Text strong style={{ display: "block" }}>
              B2B group performance
            </Text>
            <Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 12 }}>
              Non-FOFO channel mix, current data. "Avg order" and "Overdue" are shown as "-" - no orders/billing system exists yet.
            </Text>
            <Table<B2BGroupRow>
              className="thin-scroll-table"
              size="small"
              rowKey="category"
              loading={loading}
              dataSource={b2bGroup}
              pagination={false}
              locale={{ emptyText: "No non-FOFO leads yet - this report excludes FOFO, which has its own Cohort retention report" }}
              columns={[
                { title: "Category", dataIndex: "category" },
                { title: "Accounts", dataIndex: "accounts" },
                { title: "Revenue", dataIndex: "revenue", render: (v: number) => money(v) },
                { title: "Avg order", dataIndex: "avgOrder", render: (v: number | null) => money(v) },
                { title: "Overdue", dataIndex: "overdue", render: (v: number | null) => money(v) },
              ]}
            />
          </>
        )}

        {tab === "lead_source_roi" && (
          <>
            <Text strong style={{ display: "block" }}>
              Lead source ROI
            </Text>
            <Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 12 }}>
              Grouped by the inquiry source salespeople actually record. "Cost" and "CPQL" are shown as "-" - no marketing spend is tracked yet.
            </Text>
            <Table<LeadSourceRoiRow>
              className="thin-scroll-table"
              size="small"
              rowKey="source"
              loading={loading}
              dataSource={leadSource}
              pagination={false}
              columns={[
                { title: "Source", dataIndex: "source" },
                { title: "Leads", dataIndex: "leads" },
                { title: "Qualified", dataIndex: "qualified" },
                { title: "Cost", dataIndex: "cost", render: (v: number | null) => money(v) },
                { title: "CPQL", dataIndex: "cpql", render: (v: number | null) => money(v) },
              ]}
            />
          </>
        )}

        {tab === "fofo_cohort_retention" && (
          <>
            <Text strong style={{ display: "block" }}>
              FOFO cohort retention
            </Text>
            <Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 12 }}>
              Cohort and store count are real (grouped by when each store actually went live). M+3/M+6/M+12 are shown as "-" - FieldForce
              has no recurring-order tracking, so ongoing retention can't be measured yet.
            </Text>
            <Table<FofoCohortRow>
              className="thin-scroll-table"
              size="small"
              rowKey="cohortMonth"
              loading={loading}
              dataSource={cohort}
              pagination={false}
              columns={[
                { title: "Cohort", dataIndex: "cohortMonth", render: (v: string) => dayjs(v).format("MMM YYYY") },
                { title: "Stores", dataIndex: "stores" },
                { title: "M+3", dataIndex: "m3", render: (v: number | null) => (v === null ? "-" : `${v}%`) },
                { title: "M+6", dataIndex: "m6", render: (v: number | null) => (v === null ? "-" : `${v}%`) },
                { title: "M+12", dataIndex: "m12", render: (v: number | null) => (v === null ? "-" : `${v}%`) },
              ]}
            />
          </>
        )}
      </div>

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
