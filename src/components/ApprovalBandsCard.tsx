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

// Expense claims now actually read these bands for a live decision (see
// expense-service.ts) - the first real consumer of this table. Discount and
// credit-limit bands are still configuration only, since there's no
// discount/credit-limit request flow anywhere in FieldForce yet to hit
// them; customer-creation approval is real too, but through a separate
// mechanism (the lead approval chain in Settings > Approvals), not these
// bands. This screen records what each ladder should be regardless of
// whether something reads it yet, same honesty convention as
// levels.approval_ceiling. The approver is a role/level (e.g. "Regional
// Sales Manager"), not a specific person - an escalation ladder names a
// position, not whoever happens to hold it today.
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
    <Card size="small" style={{ marginBottom: 16, borderColor: appTokens.border, boxShadow: appTokens.shadowSm }} loading={loading}>
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
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {rows.map((band, idx) => {
                    const accent = idx === 0 ? appTokens.primary : idx === rows.length - 1 ? appTokens.danger : appTokens.purple;
                    return (
                      <div
                        key={band.id}
                        style={{
                          flex: "1 1 150px",
                          minWidth: 150,
                          border: `1px solid ${appTokens.border}`,
                          borderTop: `3px solid ${accent}`,
                          borderRadius: appTokens.radiusSm,
                          padding: "8px 10px",
                          background: appTokens.surfaceMuted,
                        }}
                      >
                        <Text strong style={{ fontSize: 12.5, color: accent, display: "block" }}>
                          {formatCompactCurrency(band.rangeFrom)} - {band.rangeTo !== null ? formatCompactCurrency(band.rangeTo) : "no limit"}
                        </Text>
                        <Text style={{ fontSize: 11.5, color: appTokens.textPrimary, display: "block" }}>{band.bandName}</Text>
                        <Text style={{ fontSize: 11, color: appTokens.textTertiary, display: "block" }}>
                          {levelNameOf(band.approverLevelId) ?? "No approver set"}
                          {band.countersignedByLevelId ? ` + ${levelNameOf(band.countersignedByLevelId)}` : ""}
                        </Text>
                        {band.slaHours !== null && (
                          <Text style={{ fontSize: 10.5, color: appTokens.textTertiary }}>SLA {band.slaHours}h</Text>
                        )}
                        {(canUpdate || canDelete) && (
                          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                            {canUpdate && (
                              <Button type="link" size="small" style={{ padding: 0, height: "auto", fontSize: 11 }} onClick={() => openEdit(band)}>
                                Edit
                              </Button>
                            )}
                            {canDelete && (
                              <Popconfirm title="Delete this approval band?" onConfirm={() => handleDelete(band.id)}>
                                <Button type="link" size="small" danger style={{ padding: 0, height: "auto", fontSize: 11 }}>
                                  Delete
                                </Button>
                              </Popconfirm>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
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
