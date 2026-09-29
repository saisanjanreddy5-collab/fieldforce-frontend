import { useEffect, useState } from "react";
import { Button, Tag, Typography, message } from "antd";
import * as integrationsApi from "../../api/integrations-api";
import { useMicrosoftConnection } from "../../hooks/use-microsoft-connection";
import { appTokens } from "../../utils/design-system";
import { buildIntegrationRows, STATUS_LABEL, type IntegrationRow } from "./integration-rows";
import { ConnectServiceModal } from "./ConnectServiceModal";

const { Text } = Typography;

export function IntegrationsTab() {
  const microsoft = useMicrosoftConnection();
  const [orgStatus, setOrgStatus] = useState<integrationsApi.IntegrationsStatus | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    integrationsApi.getIntegrationsStatus().then(setOrgStatus).catch(() => undefined);
  }, []);

  const rows = buildIntegrationRows(microsoft, orgStatus);

  // Every service's status is real; only Microsoft (per-user OAuth) has a
  // real per-row toggle. WhatsApp/Smartflo are org-wide env config with
  // nothing a button can flip, and the remaining rows have no backend at
  // all - both get the same honest "not available" action, never a fake
  // working one, just to fill the same visual slot Stage rows use for Edit.
  const rowAction = (row: IntegrationRow) => {
    if (row.key === "microsoft") {
      return microsoft.connected ? (
        <Button size="small" type="link" danger onClick={microsoft.disconnect}>
          Disconnect
        </Button>
      ) : (
        <Button size="small" type="link" onClick={microsoft.connect}>
          Connect
        </Button>
      );
    }
    if (row.status === "org_configured") {
      return (
        <Button size="small" type="link" onClick={() => message.info(`${row.name} is configured via server environment, not a per-row toggle`)}>
          Details
        </Button>
      );
    }
    return (
      <Button size="small" type="link" onClick={() => message.info(`${row.name} isn't available yet`)}>
        Connect
      </Button>
    );
  };

  return (
    <div
      style={{
        border: `1px solid ${appTokens.border}`,
        borderRadius: appTokens.radius,
        background: appTokens.surface,
        boxShadow: appTokens.shadowSm,
      }}
    >
      <div style={{ padding: "14px 18px", borderBottom: `1px solid ${appTokens.borderLight}` }}>
        <Text strong style={{ fontSize: 14 }}>
          Integrations
        </Text>
        <div>
          <Text style={{ fontSize: 12.5, color: appTokens.textTertiary }}>Connected services. Scopes and consent are configured per tenant.</Text>
        </div>
      </div>

      {rows.map((row) => (
        <div
          key={row.key}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 18,
            padding: "14px 28px 14px 18px",
            borderBottom: `1px solid ${appTokens.borderLight}`,
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <Text strong style={{ fontSize: 13.5 }}>
              {row.name}
            </Text>
            <div>
              <Text style={{ fontSize: 12, color: appTokens.textTertiary }}>{row.description}</Text>
            </div>
          </div>
          <Text style={{ fontSize: 12, color: appTokens.textTertiary, flexShrink: 0 }}>{row.scope}</Text>
          <Tag
            style={{
              margin: 0,
              width: 96,
              textAlign: "center",
              fontWeight: 600,
              border: "none",
              color: row.status === "not_connected" ? appTokens.textTertiary : appTokens.success,
              background: row.status === "not_connected" ? appTokens.surfaceMuted : `${appTokens.success}17`,
              flexShrink: 0,
            }}
          >
            {STATUS_LABEL[row.status]}
          </Tag>
          <div style={{ width: 72, textAlign: "right", flexShrink: 0 }}>{rowAction(row)}</div>
        </div>
      ))}

      <div style={{ padding: "14px 18px" }}>
        <Button onClick={() => setModalOpen(true)}>+ Connect a service</Button>
      </div>

      <ConnectServiceModal open={modalOpen} onClose={() => setModalOpen(false)} rows={rows} microsoft={microsoft} />
    </div>
  );
}
