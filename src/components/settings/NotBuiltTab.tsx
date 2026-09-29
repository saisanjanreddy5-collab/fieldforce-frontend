import { Typography } from "antd";
import { ToolOutlined } from "@ant-design/icons";
import { appTokens } from "../../utils/design-system";

const { Title, Text } = Typography;

interface NotBuiltTabProps {
  title: string;
  reason: string;
}

// An honest "not built yet" state, not a fabricated preview of data that
// doesn't exist - each of these needs a real decision (a rules engine, a
// public capture-form module, reworking hardcoded stage/category enums into
// real lookup tables) before it can be built for real.
export function NotBuiltTab({ title, reason }: NotBuiltTabProps) {
  return (
    <div
      style={{
        border: `1px solid ${appTokens.border}`,
        borderRadius: appTokens.radius,
        background: appTokens.surface,
        boxShadow: appTokens.shadowSm,
        padding: "40px 32px",
        textAlign: "center",
        minHeight: 520,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: "50%",
          background: appTokens.surfaceMuted,
          color: appTokens.textTertiary,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 14px",
          fontSize: 18,
        }}
      >
        <ToolOutlined />
      </div>
      <Title level={5} style={{ margin: 0 }}>
        {title} isn't built yet
      </Title>
      <Text style={{ fontSize: 13, color: appTokens.textSecondary, display: "block", marginTop: 6, maxWidth: 480, marginInline: "auto" }}>
        {reason}
      </Text>
    </div>
  );
}
