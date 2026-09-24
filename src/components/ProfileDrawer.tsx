import { useEffect, useState } from "react";
import { Button, Drawer, Input, Typography, message } from "antd";
import { CheckCircleFilled, EditOutlined, LogoutOutlined } from "@ant-design/icons";
import { useAuth } from "../context/AuthContext";
import { useMicrosoftConnection } from "../hooks/use-microsoft-connection";
import * as userApi from "../api/user-api";
import { appTokens, avatarGradient } from "../utils/design-system";

const { Text, Title } = Typography;

interface ProfileDrawerProps {
  open: boolean;
  onClose: () => void;
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

// The real delegated scopes this app's Azure AD registration actually
// requests (config/microsoft.ts MS_SCOPES on the backend) - not a
// fabricated permissions list. OnlineMeetings.ReadWrite and Files.Read.All
// are NOT granted; Teams meetings are created as calendar events with
// isOnlineMeeting:true instead, which only needs Calendars.ReadWrite.
const GRANTED_SCOPES = [
  { scope: "Mail.Send", description: "send email on leads as you" },
  { scope: "Calendars.ReadWrite", description: "create Teams meetings on your calendar" },
  { scope: "User.Read", description: "read your basic profile" },
  { scope: "offline_access", description: "stay connected without signing in again" },
];

// Per-user self-service: your own Microsoft 365 connection and your own
// Smartflo calling number, editable by you, not something only an admin
// can see or change. Opened from the header avatar.
export function ProfileDrawer({ open, onClose }: ProfileDrawerProps) {
  const { user, refreshUser, logout } = useAuth();
  const { connected, email, loading: msLoading, connect, disconnect } = useMicrosoftConnection();
  const [editingNumber, setEditingNumber] = useState(false);
  const [numberDraft, setNumberDraft] = useState("");
  const [savingNumber, setSavingNumber] = useState(false);

  useEffect(() => {
    if (open) {
      setEditingNumber(false);
      setNumberDraft(user?.smartfloAgentNumber ?? "");
    }
  }, [open, user?.smartfloAgentNumber]);

  if (!user) return null;

  const handleSaveNumber = async () => {
    const trimmed = numberDraft.trim();
    if (!trimmed) {
      message.error("Enter a phone number");
      return;
    }
    setSavingNumber(true);
    try {
      await userApi.updateOwnProfile({ smartfloAgentNumber: trimmed });
      await refreshUser();
      setEditingNumber(false);
      message.success("Calling number updated");
    } catch {
      message.error("Failed to update calling number");
    } finally {
      setSavingNumber(false);
    }
  };

  return (
    <Drawer open={open} onClose={onClose} width={420} title={null} closeIcon={null} styles={{ body: { padding: 0 } }}>
      <div style={{ padding: "20px 20px 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: appTokens.radius,
              background: avatarGradient(user.name),
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 700,
              fontSize: 16,
              flexShrink: 0,
            }}
          >
            {user.name.trim().charAt(0).toUpperCase()}
          </div>
          <div style={{ minWidth: 0 }}>
            <Title level={5} style={{ margin: 0, color: appTokens.textPrimary }}>
              {user.name}
            </Title>
            <Text style={{ fontSize: 12.5, color: appTokens.textTertiary }}>
              {[user.designation ?? capitalize(user.role), user.territory].filter(Boolean).join(" · ")}
            </Text>
          </div>
          <Button type="text" onClick={onClose} style={{ marginLeft: "auto" }}>
            ×
          </Button>
        </div>

        {/* Microsoft 365 connection - per-user (this hook always reads the
            currently logged-in viewer's own status), never a shared team
            connection. */}
        <div
          style={{
            border: `1px solid ${connected ? "#bfe6cc" : appTokens.border}`,
            background: connected ? "#f2fbf5" : appTokens.surfaceMuted,
            borderRadius: appTokens.radius,
            padding: 14,
            marginBottom: 20,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {connected && <CheckCircleFilled style={{ color: appTokens.success }} />}
              <Text strong style={{ fontSize: 13.5, color: connected ? appTokens.success : appTokens.textPrimary }}>
                {connected ? "Microsoft 365 connected" : "Microsoft 365 not connected"}
              </Text>
            </div>
            <Button
              size="small"
              danger={connected}
              type={connected ? "default" : "primary"}
              loading={msLoading}
              onClick={() => (connected ? disconnect() : connect())}
            >
              {connected ? "Disconnect account" : "Connect"}
            </Button>
          </div>

          <Text style={{ fontSize: 12.5, color: appTokens.textSecondary, display: "block", marginTop: 8 }}>
            {connected
              ? `Mail and calendar events on leads send as ${email}.`
              : "Connect your own account to send email and create Teams meetings on leads as yourself."}
          </Text>

          {connected && (
            <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 4 }}>
              {GRANTED_SCOPES.map((s) => (
                <div key={s.scope} style={{ display: "flex", gap: 6, fontSize: 12 }}>
                  <CheckCircleFilled style={{ color: appTokens.success, fontSize: 11, marginTop: 2 }} />
                  <Text style={{ fontSize: 12, color: appTokens.textSecondary }}>
                    <Text code style={{ fontSize: 11.5 }}>
                      {s.scope}
                    </Text>{" "}
                    — {s.description}
                  </Text>
                </div>
              ))}
            </div>
          )}
        </div>

        <Text style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.5, color: appTokens.textTertiary }}>PROFILE</Text>
        <div style={{ marginTop: 8, marginBottom: 20 }}>
          <ProfileField label="Role" value={user.designation ?? capitalize(user.role)} />
          {user.salesTeamName && <ProfileField label="Sales team" value={user.salesTeamName} />}
          {user.managerName && <ProfileField label="Reports to" value={user.managerName} />}
          {user.territory && <ProfileField label="Territory" value={user.territory} />}
          <ProfileField label="Work email" value={user.email} />

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${appTokens.borderLight}` }}>
            <Text style={{ fontSize: 12.5, color: appTokens.textTertiary, flexShrink: 0, width: 130 }}>Calling number</Text>
            {editingNumber ? (
              <div style={{ display: "flex", gap: 6, flex: 1, justifyContent: "flex-end" }}>
                <Input
                  size="small"
                  value={numberDraft}
                  onChange={(e) => setNumberDraft(e.target.value)}
                  placeholder="+91 98XXXXXXXX"
                  style={{ maxWidth: 160 }}
                />
                <Button size="small" type="primary" loading={savingNumber} onClick={handleSaveNumber}>
                  Save
                </Button>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Text style={{ fontSize: 13, fontWeight: 500, color: appTokens.textPrimary }}>
                  {user.smartfloAgentNumber ?? "Not set"}
                </Text>
                <Button size="small" type="text" icon={<EditOutlined />} onClick={() => setEditingNumber(true)} />
              </div>
            )}
          </div>
        </div>

        <Text style={{ fontSize: 11.5, color: appTokens.textTertiary }}>
          This is your own calling number, used when you click Call on a lead. You can change it yourself any time - no need to ask an admin.
        </Text>

        <div style={{ marginTop: 24, paddingTop: 16, paddingBottom: 20, borderTop: `1px solid ${appTokens.borderLight}` }}>
          <Button icon={<LogoutOutlined />} onClick={logout} block>
            Log out
          </Button>
        </div>
      </div>
    </Drawer>
  );
}

function ProfileField({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", padding: "10px 0", borderBottom: `1px solid ${appTokens.borderLight}` }}>
      <Text style={{ fontSize: 12.5, color: appTokens.textTertiary, flexShrink: 0, width: 130 }}>{label}</Text>
      <Text style={{ fontSize: 13, fontWeight: 500, color: appTokens.textPrimary }}>{value}</Text>
    </div>
  );
}
