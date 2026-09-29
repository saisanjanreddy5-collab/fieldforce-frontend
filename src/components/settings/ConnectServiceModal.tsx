import { Button, Modal, Typography, message } from "antd";
import type { useMicrosoftConnection } from "../../hooks/use-microsoft-connection";
import { STATUS_LABEL, type IntegrationRow } from "./integration-rows";
import { appTokens } from "../../utils/design-system";

const { Title, Text } = Typography;

interface ConnectServiceModalProps {
  open: boolean;
  onClose: () => void;
  rows: IntegrationRow[];
  microsoft: ReturnType<typeof useMicrosoftConnection>;
}

export function ConnectServiceModal({ open, onClose, rows, microsoft }: ConnectServiceModalProps) {
  return (
    <Modal
      open={open}
      onCancel={onClose}
      width={620}
      footer={
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ fontSize: 12, color: appTokens.textTertiary }}>Consent screens open in a new window and return here</Text>
          <Button type="primary" onClick={onClose}>
            Done
          </Button>
        </div>
      }
      title={
        <div>
          <Title level={5} style={{ margin: 0 }}>
            Connect a service
          </Title>
          <Text style={{ fontSize: 12, color: appTokens.textTertiary }}>
            Tenant-level connections. Individual users still link their own Microsoft 365 account from their profile.
          </Text>
        </div>
      }
    >
      <div style={{ maxHeight: 420, overflowY: "auto" }}>
        {rows.map((row, idx) => (
          <div
            key={row.key}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              padding: "12px 4px",
              borderBottom: idx === rows.length - 1 ? "none" : `1px solid ${appTokens.borderLight}`,
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Text strong style={{ fontSize: 13.5 }}>
                  {row.name}
                </Text>
                <Text style={{ fontSize: 11, color: appTokens.textTertiary, background: appTokens.surfaceMuted, padding: "1px 7px", borderRadius: 10 }}>
                  {row.scope}
                </Text>
              </div>
              <Text style={{ fontSize: 12, color: appTokens.textTertiary }}>{row.description}</Text>
            </div>
            <Text strong style={{ fontSize: 12, color: row.status === "not_connected" ? appTokens.textTertiary : appTokens.success, flexShrink: 0 }}>
              {STATUS_LABEL[row.status]}
            </Text>
            {row.key === "microsoft" ? (
              microsoft.connected ? (
                <Button size="small" danger onClick={microsoft.disconnect}>
                  Disconnect
                </Button>
              ) : (
                <Button size="small" type="primary" onClick={microsoft.connect}>
                  Connect
                </Button>
              )
            ) : row.status === "org_configured" ? (
              <Text style={{ fontSize: 11, color: appTokens.textTertiary, width: 92, textAlign: "right" }}>Set via server env</Text>
            ) : (
              <Button size="small" onClick={() => message.info(`${row.name} isn't available yet`)}>
                Connect
              </Button>
            )}
          </div>
        ))}
      </div>
    </Modal>
  );
}
