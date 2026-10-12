import { useEffect, useMemo, useState } from "react";
import { App, Avatar, Button, Input, Table, Tag, Typography } from "antd";
import { DownloadOutlined, SearchOutlined } from "@ant-design/icons";
import * as customerApi from "../api/customer-api";
import type { Customer } from "../types/customer";
import { useHasPermission } from "../hooks/use-permission";
import { avatarGradient, appTokens } from "../utils/design-system";
import { formatCompactCurrency, initials } from "../utils/lead-format";
import { categoryColor, customerRisk } from "../components/customers/customer-constants";
import { CustomerDetailPanel } from "../components/customers/CustomerDetailPanel";

const { Title, Text } = Typography;

export default function CustomersPage() {
  const { message } = App.useApp();
  const hasPermission = useHasPermission();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    customerApi
      .listCustomers()
      .then((result) => {
        setCustomers(result.customers);
        setSelectedId((current) => current ?? result.customers[0]?.id ?? null);
      })
      .catch(() => message.error("Failed to load customers"))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(
      (c) =>
        c.fullName.toLowerCase().includes(q) ||
        (c.companyName ?? "").toLowerCase().includes(q) ||
        (c.phone ?? "").toLowerCase().includes(q)
    );
  }, [customers, search]);

  // Real counts/sums from the customers already loaded - "Over credit
  // limit" is an honest arithmetic read (outstanding > limit), same spirit
  // as the rest of this app's "no fabricated figures" stat chips.
  const stats = useMemo(() => {
    const active = customers.filter((c) => c.status === "active").length;
    const overLimit = customers.filter((c) => c.creditLimit > 0 && c.outstandingBalance > c.creditLimit).length;
    const totalOutstanding = customers.reduce((sum, c) => sum + c.outstandingBalance, 0);
    return { total: customers.length, active, overLimit, totalOutstanding };
  }, [customers]);

  // Real CSV of exactly what's on screen (respects the active search) - no
  // server round trip, since the full filtered list is already loaded.
  const handleExport = () => {
    const header = ["Customer", "Company", "Phone", "Category", "Territory", "Salesperson", "Credit limit", "Outstanding balance", "Status"];
    const rows = filtered.map((c) => [
      c.fullName,
      c.companyName ?? "",
      c.phone ?? "",
      c.category ?? "",
      c.territory ?? "",
      c.ownerName ?? "",
      String(c.creditLimit),
      String(c.outstandingBalance),
      c.status,
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `customers-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!hasPermission("customers.view")) {
    return (
      <div>
        <Title level={3}>Customers</Title>
        <Text type="secondary">You do not have permission to view customers.</Text>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
        <div>
          <Title level={3} style={{ margin: 0, letterSpacing: -0.3, color: appTokens.textPrimary }}>
            Customers
          </Title>
          <Text style={{ color: appTokens.textSecondary, fontSize: 13.5 }}>
            One address book of every converted lead - ownership, credit, and balance in one place.
          </Text>
        </div>
        <Button icon={<DownloadOutlined />} onClick={handleExport} disabled={filtered.length === 0}>
          Export
        </Button>
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
        {[
          { label: "Total customers", value: String(stats.total), subtitle: "converted from leads" },
          { label: "Active", value: String(stats.active), subtitle: "in good standing" },
          { label: "Over credit limit", value: String(stats.overLimit), subtitle: "needs finance review" },
          { label: "Outstanding balance", value: formatCompactCurrency(stats.totalOutstanding), subtitle: "across all customers" },
        ].map((stat) => (
          <div
            key={stat.label}
            style={{
              flex: 1,
              minWidth: 170,
              border: `1px solid ${appTokens.borderLight}`,
              borderRadius: appTokens.radius,
              padding: "10px 14px",
              background: appTokens.surface,
              boxShadow: appTokens.shadowXs,
            }}
          >
            <Text style={{ fontSize: 11.5, fontWeight: 600, color: appTokens.textTertiary, display: "block", whiteSpace: "nowrap" }}>{stat.label}</Text>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 1, flexWrap: "wrap" }}>
              <span style={{ fontSize: 19, fontWeight: 700, color: appTokens.textPrimary, letterSpacing: -0.3, whiteSpace: "nowrap" }}>{stat.value}</span>
              <Text style={{ fontSize: 11, color: appTokens.textTertiary, whiteSpace: "nowrap" }}>{stat.subtitle}</Text>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
        <div
          style={{
            flex: "1 1 58%",
            minWidth: 0,
            border: `1px solid ${appTokens.border}`,
            borderRadius: appTokens.radius,
            background: appTokens.surface,
            boxShadow: appTokens.shadowXs,
            overflow: "hidden",
          }}
        >
          <div style={{ padding: 14, borderBottom: `1px solid ${appTokens.borderLight}` }}>
            <Input
              placeholder="Search name, company, or phone"
              prefix={<SearchOutlined style={{ color: appTokens.textTertiary }} />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              allowClear
              style={{ maxWidth: 360 }}
            />
          </div>

          <div>
            <Table<Customer>
              rowKey="id"
              size="small"
              loading={loading}
              dataSource={filtered}
              pagination={filtered.length > 20 ? { pageSize: 20 } : false}
              tableLayout="fixed"
              onRow={(record) => ({
                onClick: () => setSelectedId(record.id),
                style: { cursor: "pointer", background: record.id === selectedId ? appTokens.primarySoft : undefined },
              })}
              className="thin-scroll-table table-row-hover"
              locale={{ emptyText: loading ? " " : "No customers yet - converting a lead creates one automatically" }}
              columns={[
                {
                  title: "Customer",
                  key: "customer",
                  width: "34%",
                  render: (_, c) => {
                    // Territory is the useful second line - company name is
                    // dropped here when it's just a repeat of the person's
                    // own name (common for proprietorships), since Category
                    // already carries real classification info of its own.
                    const subtitle = c.territory ?? (c.companyName && c.companyName !== c.fullName ? c.companyName : undefined);
                    return (
                      <div style={{ display: "flex", gap: 7, alignItems: "center", overflow: "hidden" }}>
                        <Avatar size={24} style={{ background: avatarGradient(c.fullName), fontSize: 10, fontWeight: 600, flexShrink: 0 }}>
                          {initials(c.fullName)}
                        </Avatar>
                        <div style={{ minWidth: 0, overflow: "hidden" }}>
                          <Text
                            strong
                            style={{ color: appTokens.textPrimary, display: "block", fontSize: 12.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
                            title={c.fullName}
                          >
                            {c.fullName}
                          </Text>
                          {subtitle && (
                            <Text type="secondary" style={{ fontSize: 11, display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {subtitle}
                            </Text>
                          )}
                        </div>
                      </div>
                    );
                  },
                },
                {
                  title: "Category",
                  key: "category",
                  width: "16%",
                  render: (_, c) =>
                    c.category ? (
                      <Tag color={categoryColor(c.category)} style={{ margin: 0, fontSize: 11 }}>
                        {c.category}
                      </Tag>
                    ) : (
                      <Text type="secondary">—</Text>
                    ),
                },
                {
                  title: "Salesperson",
                  key: "owner",
                  width: "20%",
                  render: (_, c) => (
                    <Text style={{ fontSize: 12.5, display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {c.ownerName ?? <Text type="secondary">Unassigned</Text>}
                    </Text>
                  ),
                },
                {
                  title: "Balance due",
                  key: "outstandingBalance",
                  width: "16%",
                  align: "right" as const,
                  render: (_, c) => (
                    <Text strong style={{ fontSize: 12.5, color: c.outstandingBalance > 0 ? appTokens.danger : appTokens.textPrimary }}>
                      {formatCompactCurrency(c.outstandingBalance)}
                    </Text>
                  ),
                },
                {
                  title: "Risk",
                  key: "risk",
                  width: "14%",
                  render: (_, c) => {
                    const risk = customerRisk(c);
                    return (
                      <Tag color={risk.color} style={{ margin: 0, fontSize: 11 }}>
                        {risk.label}
                      </Tag>
                    );
                  },
                },
              ]}
            />
          </div>
        </div>

        <div
          style={{
            flex: "1 1 42%",
            minWidth: 320,
            border: `1px solid ${appTokens.border}`,
            borderRadius: appTokens.radius,
            background: appTokens.surface,
            boxShadow: appTokens.shadowXs,
            overflow: "hidden",
          }}
        >
          <CustomerDetailPanel customerId={selectedId} onChanged={load} />
        </div>
      </div>
    </div>
  );
}
