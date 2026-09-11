import { App, Avatar, Button, Progress, Tabs, Tag, Tooltip, Typography } from "antd";
import { CloudUploadOutlined, EditOutlined, MailOutlined, PhoneOutlined, TeamOutlined, WhatsAppOutlined } from "@ant-design/icons";
import type { Lead } from "../../types/lead";
import { initials, scoreColor } from "../../utils/lead-format";
import { OverviewTab } from "./tabs/OverviewTab";
import { OpportunitiesTab } from "./tabs/OpportunitiesTab";
import { ActivityTab } from "./tabs/ActivityTab";
import { LogsTab } from "./tabs/LogsTab";
import { ConsentTab } from "./tabs/ConsentTab";
import { ApprovalsTab } from "./tabs/ApprovalsTab";
import { DocumentsTab } from "./tabs/DocumentsTab";

const { Title, Text } = Typography;

interface LeadDetailProps {
  lead: Lead;
  onEdit: () => void;
}

const DISABLED_TOOLTIP_CALL = "Calling requires the telephony integration - credentials coming later";
const DISABLED_TOOLTIP_MAIL = "Email/Teams requires Microsoft 365 integration - not connected yet";

export function LeadDetail({ lead, onEdit }: LeadDetailProps) {
  const { message } = App.useApp();
  const contactLine = [lead.contactName, lead.phone, lead.email].filter(Boolean).join(" · ");

  return (
    <div>
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
        <Avatar size={48} shape="square" style={{ backgroundColor: "#1677ff", flexShrink: 0 }}>
          {initials(lead.fullName)}
        </Avatar>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <Title level={4} style={{ margin: 0 }}>
              {lead.fullName}
            </Title>
            {lead.category && <Tag color="blue">{lead.category}</Tag>}
            <Tag>{lead.status}</Tag>
            {lead.leadScore !== null && (
              <div style={{ display: "flex", alignItems: "center", gap: 4, minWidth: 80 }}>
                <Progress
                  percent={lead.leadScore}
                  size="small"
                  showInfo
                  strokeColor={scoreColor(lead.leadScore)}
                  style={{ width: 60 }}
                />
              </div>
            )}
          </div>
          <Text type="secondary">{contactLine || "-"}</Text>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
        <Tooltip title={DISABLED_TOOLTIP_CALL}>
          <Button icon={<PhoneOutlined />} disabled>
            Call
          </Button>
        </Tooltip>
        <Tooltip title={DISABLED_TOOLTIP_MAIL}>
          <Button icon={<MailOutlined />} disabled>
            Email
          </Button>
        </Tooltip>
        <Tooltip title="WhatsApp integration is out of scope for now">
          <Button icon={<WhatsAppOutlined />} disabled>
            WhatsApp
          </Button>
        </Tooltip>
        <Tooltip title={DISABLED_TOOLTIP_MAIL}>
          <Button icon={<TeamOutlined />} disabled>
            Teams meeting
          </Button>
        </Tooltip>
        <Button icon={<EditOutlined />} onClick={onEdit}>
          Edit lead
        </Button>
        <Tooltip title="Onboarding workflow preview - not wired to a real pipeline yet">
          <Button
            type="primary"
            icon={<CloudUploadOutlined />}
            onClick={() => message.info("Onboarding isn't wired up yet - this opens the Approvals tab preview")}
          >
            Onboard
          </Button>
        </Tooltip>
      </div>

      <Tabs
        style={{ marginTop: 16 }}
        items={[
          { key: "overview", label: "Overview", children: <OverviewTab lead={lead} /> },
          { key: "opportunities", label: "Opportunities", children: <OpportunitiesTab leadId={lead.id} /> },
          { key: "activity", label: "Activity & calls", children: <ActivityTab leadId={lead.id} /> },
          { key: "logs", label: "Logs", children: <LogsTab leadId={lead.id} /> },
          { key: "consent", label: "Consent", children: <ConsentTab leadId={lead.id} /> },
          { key: "approvals", label: "Approvals", children: <ApprovalsTab /> },
          { key: "documents", label: "Documents", children: <DocumentsTab /> },
        ]}
      />
    </div>
  );
}
