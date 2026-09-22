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
    <Card size="small" style={{ marginBottom: 12 }} loading={loading} styles={{ body: { padding: "10px 12px" } }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <Text strong style={{ fontSize: 13, whiteSpace: "nowrap" }}>
          Sales teams
        </Text>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, flex: 1 }}>
          {teams.length === 0 && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              No sales teams yet
            </Text>
          )}
          {teams.map((team) => (
            <Tag key={team.id} style={{ margin: 0 }}>
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
    </Card>
  );
}
