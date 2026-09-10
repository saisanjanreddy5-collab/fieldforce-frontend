import { Card, Typography } from "antd";

const { Text } = Typography;

interface StatCardProps {
  label: string;
  value: string;
  loading?: boolean;
}

export function StatCard({ label, value, loading }: StatCardProps) {
  return (
    <Card loading={loading} styles={{ body: { padding: 20 } }}>
      <Text type="secondary" style={{ fontSize: 13 }}>
        {label}
      </Text>
      <div style={{ fontSize: 28, fontWeight: 600, marginTop: 4 }}>{value}</div>
    </Card>
  );
}
