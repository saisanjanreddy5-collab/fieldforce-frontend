import { useEffect, useState } from "react";
import { Button, Card, Input, Select, Space, Tag, Typography, message } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import * as salesTeamApi from "../api/sales-team-api";
import type { SalesTeam } from "../types/sales-team";
import { useHasPermission } from "../hooks/use-permission";

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
    <Card size="small" style={{ marginBottom: 16 }} loading={loading}>
      <Text strong>Sales teams</Text>
      <div style={{ marginTop: 8, marginBottom: 12, display: "flex", flexWrap: "wrap", gap: 6 }}>
        {teams.length === 0 && <Text type="secondary">No sales teams yet - create one below</Text>}
        {teams.map((team) => (
          <Tag key={team.id}>
            {team.name}
            {team.region ? ` · ${team.region}` : ""}
          </Tag>
        ))}
      </div>
      {hasPermission("sales_teams.create") && (
        <Space.Compact style={{ width: "100%", maxWidth: 480 }}>
          <Input
            placeholder="e.g. West · Franchise"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onPressEnter={handleCreate}
          />
          <Select placeholder="Region" style={{ width: 140 }} options={REGION_OPTIONS} value={region} onChange={setRegion} allowClear />
          <Button type="primary" icon={<PlusOutlined />} loading={creating} onClick={handleCreate}>
            Add
          </Button>
        </Space.Compact>
      )}
    </Card>
  );
}
