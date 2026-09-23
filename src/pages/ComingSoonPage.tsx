import { Card, Typography } from "antd";
import { ToolOutlined } from "@ant-design/icons";
import { appTokens } from "../utils/design-system";

const { Title, Text } = Typography;

interface ComingSoonPageProps {
  title: string;
}

export default function ComingSoonPage({ title }: ComingSoonPageProps) {
  return (
    <Card style={{ boxShadow: appTokens.shadowXs }}>
      <div style={{ textAlign: "center", padding: "56px 16px" }}>
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: appTokens.radiusLg,
            background: appTokens.surfaceMuted,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 16px",
          }}
        >
          <ToolOutlined style={{ fontSize: 24, color: appTokens.textTertiary }} />
        </div>
        <Title level={4} style={{ marginTop: 0, color: appTokens.textPrimary }}>
          {title}
        </Title>
        <Text style={{ color: appTokens.textSecondary }}>This module isn't built yet — coming in a future update.</Text>
      </div>
    </Card>
  );
}
