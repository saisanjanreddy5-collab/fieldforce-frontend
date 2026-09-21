import { useEffect, useState } from "react";
import { Button, Card, Input, Space, Tag, Typography, message } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import * as levelApi from "../api/level-api";
import type { Level } from "../types/level";
import { useHasPermission } from "../hooks/use-permission";

const { Text } = Typography;

interface LevelsMiniCardProps {
  refreshKey?: number;
  onChange?: (levels: Level[]) => void;
}

// Phase 1A only needs a name so a person can be assigned a level - approval
// ceilings, max direct reports, and drag-to-reorder are the later Levels &
// axes phase, which upgrades this same table rather than replacing it.
export function LevelsMiniCard({ refreshKey, onChange }: LevelsMiniCardProps) {
  const hasPermission = useHasPermission();
  const [levels, setLevels] = useState<Level[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);

  const load = () => {
    setLoading(true);
    levelApi
      .listLevels()
      .then((rows) => {
        setLevels(rows);
        onChange?.(rows);
      })
      .catch(() => message.error("Failed to load levels"))
      .finally(() => setLoading(false));
  };

  useEffect(load, [refreshKey]);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setCreating(true);
    try {
      await levelApi.createLevel({ name: name.trim(), sortOrder: levels.length });
      setName("");
      load();
    } catch {
      message.error("Failed to create level - the name may already be taken");
    } finally {
      setCreating(false);
    }
  };

  return (
    <Card size="small" style={{ marginBottom: 16 }} loading={loading}>
      <Text strong>Levels</Text>
      <div style={{ marginTop: 8, marginBottom: 12, display: "flex", flexWrap: "wrap", gap: 6 }}>
        {levels.length === 0 && <Text type="secondary">No levels yet - create one below</Text>}
        {levels.map((level) => (
          <Tag key={level.id}>{level.name}</Tag>
        ))}
      </div>
      {hasPermission("levels.create") && (
        <Space.Compact style={{ width: "100%", maxWidth: 360 }}>
          <Input
            placeholder="e.g. Regional Sales Manager"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onPressEnter={handleCreate}
          />
          <Button type="primary" icon={<PlusOutlined />} loading={creating} onClick={handleCreate}>
            Add
          </Button>
        </Space.Compact>
      )}
    </Card>
  );
}
