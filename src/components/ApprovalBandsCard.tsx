import { useEffect, useMemo, useState } from "react";
import { Button, Card, Popconfirm, Tag, Typography, message } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import * as approvalBandApi from "../api/approval-band-api";
import type { ApprovalBand, ApprovalRequestType } from "../types/approval-band";
import type { Level } from "../types/level";
import { useHasPermission } from "../hooks/use-permission";
import { formatCompactCurrency } from "../utils/lead-format";
import { appTokens } from "../utils/design-system";
import { ApprovalBandDrawer } from "./ApprovalBandDrawer";

const { Text } = Typography;

export const REQUEST_TYPE_OPTIONS: { value: ApprovalRequestType; label: string }[] = [
  { value: "discount", label: "Discount" },
  { value: "customer_creation", label: "Customer creation" },
  { value: "credit_limit", label: "Credit limit" },
  { value: "expense_claim", label: "Expense claim" },
];

interface ApprovalBandsCardProps {
  levels: Level[];
}

// Every band here is configuration only - there is no request/workflow
// system anywhere in FieldForce today for a discount, customer-creation,
// credit-limit or expense-claim request to actually flow through and hit
// one of these bands. This screen only records what the ladder SHOULD be
// once such a system exists, same honesty convention as levels.approval_ceiling.
// The approver is a role/level (e.g. "Regional Sales Manager"), not a
// specific person - an escalation ladder names a position, not whoever
// happens to hold it today.
export function ApprovalBandsCard({ levels }: ApprovalBandsCardProps) {
  const hasPermission = useHasPermission();
  const canCreate = hasPermission("approval_bands.create");
  const canUpdate = hasPermission("approval_bands.update");
  const canDelete = hasPermission("approval_bands.delete");
  const [bands, setBands] = useState<ApprovalBand[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingBand, setEditingBand] = useState<ApprovalBand | null>(null);
  const [defaultRequestType, setDefaultRequestType] = useState<ApprovalRequestType>("discount");

  const load = () => {
    setLoading(true);
    approvalBandApi
      .listApprovalBands()
      .then(setBands)
      .catch(() => message.error("Failed to load approval bands"))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const byType = useMemo(() => {
    const groups = new Map<ApprovalRequestType, ApprovalBand[]>();
    for (const opt of REQUEST_TYPE_OPTIONS) groups.set(opt.value, []);
    for (const band of bands) groups.get(band.requestType)?.push(band);
    return groups;
  }, [bands]);

  const levelNameOf = (id: string | null) => (id ? levels.find((l) => l.id === id)?.name ?? "Unknown" : null);

  const openCreate = (requestType: ApprovalRequestType) => {
    setEditingBand(null);
    setDefaultRequestType(requestType);
    setDrawerOpen(true);
  };

  const openEdit = (band: ApprovalBand) => {
    setEditingBand(band);
    setDefaultRequestType(band.requestType);
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setEditingBand(null);
  };

  const handleSaved = () => {
    closeDrawer();
    load();
  };

  const handleDelete = async (id: string) => {
    try {
      await approvalBandApi.deleteApprovalBand(id);
      message.success("Approval band deleted");
      load();
    } catch {
      message.error("Failed to delete approval band");
    }
  };

  return (
    <Card size="small" style={{ marginBottom: 16 }} loading={loading}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
        <div>
          <Text strong>Approval bands</Text>
          <div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Escalation ladders per request type - requests start with the reporting manager and climb as value rises
            </Text>
          </div>
        </div>
        <Tag color="gold">Configuration only - not yet wired to a live approval flow</Tag>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12, marginTop: 12 }}>
        {REQUEST_TYPE_OPTIONS.map((opt) => {
          const rows = byType.get(opt.value) ?? [];
          return (
            <div
              key={opt.value}
              style={{
                border: `1px solid ${appTokens.border}`,
                borderRadius: appTokens.radius,
                padding: 12,
                background: appTokens.surface,
                boxShadow: appTokens.shadowXs,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <Text strong style={{ fontSize: 13 }}>
                  {opt.label}
                </Text>
                {canCreate && (
                  <Button type="link" size="small" icon={<PlusOutlined />} onClick={() => openCreate(opt.value)}>
                    Add band
                  </Button>
                )}
              </div>

              {rows.length === 0 ? (
                <Text type="secondary" style={{ fontSize: 12 }}>
                  No bands configured
                </Text>
              ) : (
                rows.map((band) => (
                  <div
                    key={band.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      padding: "6px 0",
                      borderTop: `1px solid ${appTokens.borderLight}`,
                    }}
                  >
                    <div>
                      <Text style={{ fontSize: 12 }}>{band.bandName}</Text>
                      <div>
                        <Text type="secondary" style={{ fontSize: 11 }}>
                          {formatCompactCurrency(band.rangeFrom)} - {band.rangeTo !== null ? formatCompactCurrency(band.rangeTo) : "no limit"}
                        </Text>
                      </div>
                      <div>
                        <Text type="secondary" style={{ fontSize: 11 }}>
                          {levelNameOf(band.approverLevelId) ?? "No approver set"}
                          {band.countersignedByLevelId ? ` + ${levelNameOf(band.countersignedByLevelId)}` : ""}
                          {band.slaHours !== null ? ` · SLA ${band.slaHours}h` : ""}
                        </Text>
                      </div>
                    </div>
                    {(canUpdate || canDelete) && (
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                        {canUpdate && (
                          <Button type="link" size="small" onClick={() => openEdit(band)}>
                            Edit
                          </Button>
                        )}
                        {canDelete && (
                          <Popconfirm title="Delete this approval band?" onConfirm={() => handleDelete(band.id)}>
                            <Button type="link" size="small" danger>
                              Delete
                            </Button>
                          </Popconfirm>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          );
        })}
      </div>

      <ApprovalBandDrawer
        open={drawerOpen}
        band={editingBand}
        defaultRequestType={defaultRequestType}
        nextSortOrder={(byType.get(defaultRequestType) ?? []).length}
        levels={levels}
        onClose={closeDrawer}
        onSaved={handleSaved}
      />
    </Card>
  );
}
