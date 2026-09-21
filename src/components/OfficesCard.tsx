import { useEffect, useMemo, useState } from "react";
import { Button, Card, Input, Select, Space, Tag, Typography, message } from "antd";
import { EnvironmentOutlined, PlusOutlined, ShopOutlined } from "@ant-design/icons";
import * as officeApi from "../api/office-api";
import * as salesTeamApi from "../api/sales-team-api";
import type { Office } from "../types/office";
import type { State, Zone } from "../types/sales-team";
import { useHasPermission } from "../hooks/use-permission";
import { OfficeDrawer } from "./OfficeDrawer";

const { Text, Title } = Typography;

const STATUS_FILTER_OPTIONS = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

export const OFFICE_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "head_office", label: "Head office" },
  { value: "regional_office", label: "Regional office" },
  { value: "branch", label: "Branch" },
];

export const OFFICE_TYPE_LABELS: Record<string, string> = {
  head_office: "Head office",
  regional_office: "Regional office",
  branch: "Branch",
};

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
  const [states, setStates] = useState<State[]>([]);
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

  // Loaded once (unfiltered) purely to label each card's GST state - the
  // drawer's own Region -> State picker loads its own filtered list.
  useEffect(() => {
    salesTeamApi.listStates().then(setStates).catch(() => undefined);
  }, []);

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

      {offices.length > 0 && filteredOffices.length === 0 ? (
        <Text type="secondary">No offices match your search</Text>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
          {filteredOffices.map((office) => {
            const region = zones.find((z) => z.id === office.zoneId)?.name ?? office.region;
            const state = states.find((s) => s.id === office.stateId);
            const addressPreview = [office.address, office.addressLine2, office.city].filter(Boolean).join(", ");
            return (
              <div key={office.id} style={{ border: "1px solid #f0f0f0", borderRadius: 8, padding: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "flex-start", minWidth: 0 }}>
                    <ShopOutlined style={{ fontSize: 18, color: "#1677ff", marginTop: 2 }} />
                    <div style={{ minWidth: 0 }}>
                      <Text strong style={{ display: "block" }}>
                        {office.name}
                      </Text>
                      {addressPreview && (
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {addressPreview}
                          {office.pincode ? ` ${office.pincode}` : ""}
                        </Text>
                      )}
                    </div>
                  </div>
                  {office.type && <Tag>{OFFICE_TYPE_LABELS[office.type] ?? office.type}</Tag>}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 10, fontSize: 12 }}>
                  <div>
                    <Text type="secondary">GST state</Text>
                    <div>{state ? `${state.name} · ${state.gstCode ?? "-"}` : "-"}</div>
                  </div>
                  <div>
                    <Text type="secondary">Region</Text>
                    <div>{region ?? "-"}</div>
                  </div>
                  <div>
                    <Text type="secondary">People</Text>
                    <div>{office.employeeCount} people</div>
                  </div>
                  <div>
                    <Text type="secondary">Phone</Text>
                    <div>{office.phone ?? "-"}</div>
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
                  <Space size={4}>
                    <Tag icon={<EnvironmentOutlined />} color={office.latitude !== null ? "blue" : "default"}>
                      {office.latitude !== null && office.longitude !== null
                        ? `${office.latitude.toFixed(4)}, ${office.longitude.toFixed(4)}`
                        : "No location tag"}
                    </Tag>
                  </Space>
                  {hasPermission("offices.update") && (
                    <Space size={4}>
                      <Button type="link" size="small" onClick={() => openEdit(office)}>
                        Edit
                      </Button>
                      <Button type="link" size="small" onClick={() => toggleActive(office)}>
                        {office.isActive ? "Deactivate" : "Activate"}
                      </Button>
                    </Space>
                  )}
                </div>
                <Tag color={office.isActive ? "green" : "default"} style={{ marginTop: 8 }}>
                  {office.isActive ? "Active" : "Inactive"}
                </Tag>
              </div>
            );
          })}
          {hasPermission("offices.create") && (
            <div
              role="button"
              onClick={openCreate}
              style={{
                border: "1px dashed #d9d9d9",
                borderRadius: 8,
                padding: 12,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                color: "#1677ff",
                minHeight: 120,
              }}
            >
              <PlusOutlined style={{ fontSize: 18 }} />
              <Title level={5} style={{ margin: "4px 0 0", color: "#1677ff" }}>
                Create an office
              </Title>
              <Text type="secondary" style={{ fontSize: 12, textAlign: "center" }}>
                Name, type, full address, GST state and a map location tag
              </Text>
            </div>
          )}
        </div>
      )}

      <OfficeDrawer open={drawerOpen} office={editingOffice} zones={zones} onClose={closeDrawer} onSaved={handleSaved} />
    </Card>
  );
}
