import { Card, Typography } from "antd";
import { ToolOutlined } from "@ant-design/icons";

const { Title, Text } = Typography;

interface ComingSoonPageProps {
  title: string;
}

export default function ComingSoonPage({ title }: ComingSoonPageProps) {
  return (
    <Card>
      <div style={{ textAlign: "center", padding: "48px 16px" }}>
        <ToolOutlined style={{ fontSize: 32, color: "#898781", marginBottom: 16 }} />
        <Title level={4} style={{ marginTop: 0 }}>
          {title}
        </Title>
        <Text type="secondary">This module isn't built yet — coming in a future update.</Text>
      </div>
    </Card>
  );
}
