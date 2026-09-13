import { useEffect } from "react";
import { Button, Card, Space, Tag, Typography, message } from "antd";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useMicrosoftConnection } from "../hooks/use-microsoft-connection";

const { Text } = Typography;

// Each person connects their own Microsoft 365 account - this is
// per-user, not a team-wide setting, which is why it shows the
// current viewer's own connection rather than a list of everyone's.
export function MicrosoftConnectionCard() {
  const { connected, email, loading, connect, disconnect } = useMicrosoftConnection();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const outcome = searchParams.get("microsoft");
    if (outcome === "connected") {
      message.success("Microsoft 365 connected");
      setSearchParams({}, { replace: true });
    } else if (outcome === "error") {
      message.error(searchParams.get("reason") ?? "Failed to connect Microsoft 365");
      setSearchParams({}, { replace: true });
    }
    // Refetch happens via the hook's own mount effect; navigating away the
    // query string is just to avoid re-showing the toast on refresh.
  }, [searchParams, setSearchParams, navigate]);

  return (
    <Card size="small" style={{ marginBottom: 16 }} loading={loading}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
        <div>
          <Text strong>Your Microsoft 365 connection</Text>
          <div>
            {connected ? (
              <Space size={6}>
                <Tag color="green">Connected</Tag>
                <Text type="secondary">{email}</Text>
              </Space>
            ) : (
              <Text type="secondary">Not connected - email and Teams meetings on leads need this first</Text>
            )}
          </div>
        </div>
        {connected ? (
          <Button danger onClick={() => disconnect()}>
            Disconnect
          </Button>
        ) : (
          <Button type="primary" onClick={() => connect()}>
            Connect Microsoft 365
          </Button>
        )}
      </div>
    </Card>
  );
}
