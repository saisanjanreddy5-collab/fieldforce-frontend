import { useEffect, useState } from "react";
import { Avatar, Button, Typography, message } from "antd";
import { useNavigate } from "react-router-dom";
import * as microsoftApi from "../../api/microsoft-api";
import { useAuth } from "../../context/AuthContext";
import { avatarGradient, appTokens } from "../../utils/design-system";
import { initials } from "../../utils/lead-format";
import { errorMessageFrom } from "../../utils/api-error";

const { Text } = Typography;

export function UsersAccessTab() {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<microsoftApi.UserMicrosoftConnection[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    microsoftApi
      .listUsersStatus()
      .then(setUsers)
      .catch(() => message.error("Failed to load users"))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleDisconnect = async (userId: string, name: string) => {
    try {
      await microsoftApi.disconnectUser(userId);
      message.success(`Disconnected ${name}'s Microsoft 365 account`);
      load();
    } catch (err) {
      message.error(errorMessageFrom(err, "Failed to disconnect"));
    }
  };

  // A real OAuth login can only ever be completed by the person it belongs
  // to - an admin can revoke someone else's connection (real, above) but
  // can't finish their sign-in for them. So this button is real for your
  // own row, and an honest nudge for anyone else's, rather than either a
  // fake "connect on their behalf" action or no button at all.
  const handleConnectClick = async (targetUserId: string, targetName: string) => {
    if (targetUserId === currentUser?.id) {
      const url = await microsoftApi.getConnectUrl(window.location.pathname);
      window.location.href = url;
      return;
    }
    message.info(`${targetName} needs to connect this themselves, from their own profile`);
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
      <div
        style={{
          padding: "14px 18px",
          borderBottom: `1px solid ${appTokens.borderLight}`,
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 18,
        }}
      >
        <div>
          <Text strong style={{ fontSize: 14 }}>
            Users &amp; access
          </Text>
          <div>
            <Text style={{ fontSize: 12.5, color: appTokens.textTertiary }}>Each user connects their own Microsoft 365 account, so mail and meetings send as them.</Text>
          </div>
          <div>
            <Text style={{ fontSize: 12.5, color: appTokens.textTertiary }}>
              Looking for roles and permissions instead? That's managed under Sales force management.
            </Text>
          </div>
        </div>
        <Button size="small" onClick={() => navigate("/sales-force-management")} style={{ flexShrink: 0 }}>
          Manage roles &amp; permissions
        </Button>
      </div>

      {!loading &&
        users.map((u, idx) => (
          <div
            key={u.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 18,
              padding: "14px 28px 14px 18px",
              borderBottom: idx === users.length - 1 ? "none" : `1px solid ${appTokens.borderLight}`,
            }}
          >
            <Avatar size={32} style={{ background: avatarGradient(u.name), fontSize: 12, fontWeight: 600, flexShrink: 0 }}>
              {initials(u.name)}
            </Avatar>
            <div style={{ flex: 1, minWidth: 0 }}>
              <Text strong style={{ fontSize: 13.5 }}>
                {u.name}
              </Text>
              <div>
                <Text style={{ fontSize: 12, color: appTokens.textTertiary }}>{u.designation ?? "—"}</Text>
              </div>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0, minWidth: 220 }}>
              <Text strong style={{ fontSize: 12, color: u.connected ? appTokens.success : appTokens.textTertiary, display: "block" }}>
                {u.connected ? "Microsoft 365 connected" : "Not connected"}
              </Text>
              <Text style={{ fontSize: 11.5, color: appTokens.textTertiary }}>{u.connected ? u.email : "Sign in to link mailbox and calendar"}</Text>
            </div>
            {u.connected ? (
              <Button size="small" danger onClick={() => handleDisconnect(u.id, u.name)}>
                Disconnect
              </Button>
            ) : (
              <Button size="small" type="primary" onClick={() => handleConnectClick(u.id, u.name)}>
                Connect Microsoft 365
              </Button>
            )}
          </div>
        ))}
    </div>
  );
}
