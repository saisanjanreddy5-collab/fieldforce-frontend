import { useState } from "react";
import { Typography } from "antd";
import { appTokens } from "../utils/design-system";
import { StagesTab } from "../components/settings/StagesTab";
import { CategoriesTab } from "../components/settings/CategoriesTab";
import { AssignmentRulesTab } from "../components/settings/AssignmentRulesTab";
import { ApprovalsTab } from "../components/settings/ApprovalsTab";
import { SlaEscalationTab } from "../components/settings/SlaEscalationTab";
import { LeaveTypesTab } from "../components/settings/LeaveTypesTab";
import { TemplatesTab } from "../components/settings/TemplatesTab";
import { IntegrationsTab } from "../components/settings/IntegrationsTab";
import { UsersAccessTab } from "../components/settings/UsersAccessTab";
import { QrLeadCaptureTab } from "../components/settings/QrLeadCaptureTab";
import { NotBuiltTab } from "../components/settings/NotBuiltTab";

const { Title, Text } = Typography;

type TabKey =
  | "stages"
  | "categories"
  | "assignment_rules"
  | "approvals"
  | "sla"
  | "templates"
  | "integrations"
  | "leave_types"
  | "qr_lead_capture"
  | "whatsapp_api"
  | "users_access";

const TAB_ROWS: { key: TabKey; label: string }[][] = [
  [
    { key: "stages", label: "Stages" },
    { key: "categories", label: "Categories" },
    { key: "assignment_rules", label: "Assignment rules" },
    { key: "approvals", label: "Approvals" },
    { key: "sla", label: "SLA & escalation" },
    { key: "templates", label: "Templates" },
    { key: "integrations", label: "Integrations" },
    { key: "leave_types", label: "Leave types" },
    { key: "qr_lead_capture", label: "QR lead capture" },
  ],
  [
    { key: "whatsapp_api", label: "WhatsApp API" },
    { key: "users_access", label: "Users & access" },
  ],
];

export default function SettingsPage() {
  const [tab, setTab] = useState<TabKey>("integrations");

  const pill = (key: TabKey, label: string) => {
    const active = tab === key;
    return (
      <button
        key={key}
        type="button"
        onClick={() => setTab(key)}
        style={{
          padding: "5px 11px",
          fontSize: 12.5,
          fontFamily: appTokens.font,
          fontWeight: active ? 600 : 500,
          borderRadius: 999,
          border: `1px solid ${active ? appTokens.primary : appTokens.border}`,
          background: active ? appTokens.primarySoft : appTokens.surface,
          color: active ? appTokens.primary : appTokens.textPrimary,
          cursor: "pointer",
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </button>
    );
  };

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <Title level={3} style={{ margin: 0, letterSpacing: -0.3, color: appTokens.textPrimary }}>
          Settings
        </Title>
        <Text style={{ color: appTokens.textSecondary, fontSize: 13.5 }}>
          Configuration an admin owns. No code changes needed to add a stage, category or rule.
        </Text>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 20 }}>
        {TAB_ROWS.map((row, idx) => (
          <div key={idx} style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {row.map((t) => pill(t.key, t.label))}
          </div>
        ))}
      </div>

      <div>
        {tab === "stages" && <StagesTab />}
        {tab === "categories" && <CategoriesTab />}
        {tab === "assignment_rules" && <AssignmentRulesTab />}
        {tab === "approvals" && <ApprovalsTab />}
        {tab === "sla" && <SlaEscalationTab />}
        {tab === "templates" && <TemplatesTab />}
        {tab === "integrations" && <IntegrationsTab />}
        {tab === "leave_types" && <LeaveTypesTab />}
        {tab === "users_access" && <UsersAccessTab />}
        {tab === "qr_lead_capture" && <QrLeadCaptureTab />}
        {tab === "whatsapp_api" && (
          <NotBuiltTab
            title="WhatsApp API"
            reason="Connection status is already real (see the Integrations tab). The business-account details and message-template approval table need K3's template/business-profile endpoints, which are still returning 401 and unresolved - can't show real data here until that's fixed on their end."
          />
        )}
      </div>
    </div>
  );
}
