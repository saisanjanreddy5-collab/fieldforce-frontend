import { useEffect, useState } from "react";
import { Button, Input, Select, Space, Tag, Typography, message } from "antd";
import { PlusOutlined, TeamOutlined } from "@ant-design/icons";
import * as salesTeamApi from "../api/sales-team-api";
import type { SalesTeam } from "../types/sales-team";
import { useHasPermission } from "../hooks/use-permission";
import { appTokens } from "../utils/design-system";

const { Text } = Typography;

const REGION_OPTIONS = ["West", "North", "South", "East"].map((r) => ({ value: r, label: r }));

interface SalesTeamsCardProps {
  /** Bumped by the parent whenever it wants this card to refetch (e.g. after creating a user references a new team). */
  refreshKey?: number;
  onChange?: (teams: SalesTeam[]) => void;
}

export function SalesTeamsCard({ refreshKey, onChange }: SalesTeamsCardProps) {
  const hasPermission = useHasPermission();
  const [teams, setTeams] = useState<SalesTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [region, setRegion] = useState<string | undefined>();
  const [creating, setCreating] = useState(false);

  const load = () => {
    setLoading(true);
    salesTeamApi
      .listSalesTeams()
      .then((rows) => {
        setTeams(rows);
        onChange?.(rows);
      })
      .catch(() => message.error("Failed to load sales teams"))
      .finally(() => setLoading(false));
  };

  useEffect(load, [refreshKey]);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setCreating(true);
    try {
      await salesTeamApi.createSalesTeam({ name: name.trim(), region });
      setName("");
      setRegion(undefined);
      load();
    } catch {
      message.error("Failed to create sales team - the name may already be taken");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        flexWrap: "wrap",
        border: `1px solid ${appTokens.border}`,
        borderRadius: appTokens.radius,
        background: appTokens.surface,
        boxShadow: appTokens.shadowSm,
        padding: "10px 14px",
        marginBottom: 14,
        opacity: loading ? 0.6 : 1,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
        <TeamOutlined style={{ fontSize: 13, color: appTokens.textTertiary }} />
        <Text strong style={{ fontSize: 13, whiteSpace: "nowrap", color: appTokens.textPrimary }}>
          Sales teams
        </Text>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, flex: 1 }}>
        {teams.length === 0 && (
          <Text style={{ fontSize: 12, color: appTokens.textTertiary }}>No sales teams yet</Text>
        )}
        {teams.map((team) => (
          <Tag
            key={team.id}
            style={{ margin: 0, color: appTokens.primary, background: appTokens.primarySoft, border: "none", fontWeight: 500 }}
          >
            {team.name}
            {team.region ? ` · ${team.region}` : ""}
          </Tag>
        ))}
      </div>
      {hasPermission("sales_teams.create") && (
        <Space.Compact size="small" style={{ width: 340, flexShrink: 0 }}>
          <Input
            size="small"
            placeholder="e.g. West · Franchise"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onPressEnter={handleCreate}
          />
          <Select size="small" placeholder="Region" style={{ width: 100 }} options={REGION_OPTIONS} value={region} onChange={setRegion} allowClear />
          <Button size="small" type="primary" icon={<PlusOutlined />} loading={creating} onClick={handleCreate}>
            Add
          </Button>
        </Space.Compact>
      )}
    </div>
  );
}
