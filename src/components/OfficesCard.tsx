import { useEffect, useMemo, useState } from "react";
import { Button, Card, Input, Select, Space, Table, Tag, Typography, message } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import * as officeApi from "../api/office-api";
import type { Office } from "../types/office";
import type { Zone } from "../types/sales-team";
import { useHasPermission } from "../hooks/use-permission";
import { OfficeDrawer } from "./OfficeDrawer";

const { Text } = Typography;

const STATUS_FILTER_OPTIONS = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

interface OfficesCardProps {
  zones: Zone[];
  onChange?: (offices: Office[]) => void;
}

// Standalone organizational master data - no Attendance/Expenses/Leave
// integration here, just the office directory itself and who's assigned
// (via the existing users.office_id, read-only here).
export function OfficesCard({ zones, onChange }: OfficesCardProps) {
  const hasPermission = useHasPermission();
  const [offices, setOffices] = useState<Office[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingOffice, setEditingOffice] = useState<Office | null>(null);

  const load = () => {
    setLoading(true);
    officeApi
      .listOffices()
      .then((rows) => {
        setOffices(rows);
        onChange?.(rows);
      })
      .catch(() => message.error("Failed to load offices"))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const filteredOffices = useMemo(() => {
    const q = search.trim().toLowerCase();
    return offices.filter((o) => {
      if (statusFilter === "active" && !o.isActive) return false;
      if (statusFilter === "inactive" && o.isActive) return false;
      if (!q) return true;
      return (
        o.name.toLowerCase().includes(q) ||
        (o.code ?? "").toLowerCase().includes(q) ||
        (o.address ?? "").toLowerCase().includes(q)
      );
    });
  }, [offices, search, statusFilter]);

  const openCreate = () => {
    setEditingOffice(null);
    setDrawerOpen(true);
  };

  const openEdit = (office: Office) => {
    setEditingOffice(office);
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setEditingOffice(null);
  };

  const handleSaved = () => {
    closeDrawer();
    load();
  };

  const toggleActive = async (office: Office) => {
    try {
      await officeApi.updateOffice(office.id, { isActive: !office.isActive });
      message.success(office.isActive ? "Office deactivated" : "Office activated");
      load();
    } catch {
      message.error("Failed to update office status");
    }
  };

  return (
    <Card size="small" style={{ marginBottom: 16 }} loading={loading}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8, flexWrap: "wrap", gap: 8 }}>
        <Text strong>Offices</Text>
        {hasPermission("offices.create") && (
          <Button size="small" type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            New office
          </Button>
        )}
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <Input.Search
          placeholder="Search offices"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ maxWidth: 240 }}
          allowClear
        />
        <Select value={statusFilter} onChange={setStatusFilter} options={STATUS_FILTER_OPTIONS} style={{ width: 110 }} />
      </div>
      <Table<Office>
        size="small"
        rowKey="id"
        dataSource={filteredOffices}
        pagination={false}
        locale={{ emptyText: offices.length === 0 ? "No offices yet - create one above" : "No offices match your search" }}
        columns={[
          { title: "Name", dataIndex: "name" },
          { title: "Code", dataIndex: "code", render: (v: string | null) => v ?? "-" },
          {
            title: "Region",
            dataIndex: "zoneId",
            render: (zoneId: string | null, office) => zones.find((z) => z.id === zoneId)?.name ?? office.region ?? "-",
          },
          { title: "Phone", dataIndex: "phone", render: (v: string | null) => v ?? "-" },
          { title: "Employees", dataIndex: "employeeCount" },
          {
            title: "Status",
            dataIndex: "isActive",
            render: (isActive: boolean) => <Tag color={isActive ? "green" : "default"}>{isActive ? "Active" : "Inactive"}</Tag>,
          },
          {
            title: "",
            key: "actions",
            render: (_, office) =>
              hasPermission("offices.update") ? (
                <Space size={4}>
                  <Button type="link" size="small" onClick={() => openEdit(office)}>
                    Edit
                  </Button>
                  <Button type="link" size="small" onClick={() => toggleActive(office)}>
                    {office.isActive ? "Deactivate" : "Activate"}
                  </Button>
                </Space>
              ) : null,
          },
        ]}
      />
      <OfficeDrawer open={drawerOpen} office={editingOffice} zones={zones} onClose={closeDrawer} onSaved={handleSaved} />
    </Card>
  );
}
