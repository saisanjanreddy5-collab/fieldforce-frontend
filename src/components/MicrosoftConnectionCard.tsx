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
    <Card size="small" style={{ marginBottom: 12 }} loading={loading} styles={{ body: { padding: "8px 12px" } }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <Text strong style={{ fontSize: 13, whiteSpace: "nowrap" }}>
            Microsoft 365
          </Text>
          {connected ? (
            <Space size={6}>
              <Tag color="green" style={{ margin: 0 }}>
                Connected
              </Tag>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {email}
              </Text>
            </Space>
          ) : (
            <Text type="secondary" style={{ fontSize: 12 }}>
              Not connected - email and Teams meetings on leads need this first
            </Text>
          )}
        </div>
        {connected ? (
          <Button size="small" danger onClick={() => disconnect()}>
            Disconnect
          </Button>
        ) : (
          <Button size="small" type="primary" onClick={() => connect()}>
            Connect
          </Button>
        )}
      </div>
    </Card>
  );
}
