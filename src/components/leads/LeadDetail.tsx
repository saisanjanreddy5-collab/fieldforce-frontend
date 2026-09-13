import { useState } from "react";
import { App, Avatar, Button, DatePicker, Form, Input, Modal, Progress, Select, Tabs, Tag, Tooltip, Typography } from "antd";
import { CloudUploadOutlined, EditOutlined, MailOutlined, PhoneOutlined, TeamOutlined, WhatsAppOutlined } from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";
import type { Lead } from "../../types/lead";
import { initials, scoreColor } from "../../utils/lead-format";
import { useMicrosoftConnection } from "../../hooks/use-microsoft-connection";
import * as microsoftApi from "../../api/microsoft-api";
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

interface EmailFormValues {
  subject: string;
  body: string;
}

interface MeetingFormValues {
  subject: string;
  startTime: Dayjs;
  durationMinutes: number;
}

const DISABLED_TOOLTIP_CALL = "Calling requires the telephony integration - credentials coming later";
const NOT_CONNECTED_TOOLTIP = "Connect your Microsoft 365 account under Sales force management first";

export function LeadDetail({ lead, onEdit }: LeadDetailProps) {
  const { message } = App.useApp();
  const { connected: microsoftConnected } = useMicrosoftConnection();
  const [emailOpen, setEmailOpen] = useState(false);
  const [meetingOpen, setMeetingOpen] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [creatingMeeting, setCreatingMeeting] = useState(false);
  const [emailForm] = Form.useForm<EmailFormValues>();
  const [meetingForm] = Form.useForm<MeetingFormValues>();
  const contactLine = [lead.contactName, lead.phone, lead.email].filter(Boolean).join(" · ");

  const handleSendEmail = async (values: EmailFormValues) => {
    setSendingEmail(true);
    try {
      await microsoftApi.sendLeadEmail(lead.id, values.subject, values.body);
      message.success("Email sent");
      emailForm.resetFields();
      setEmailOpen(false);
    } catch {
      message.error("Failed to send email");
    } finally {
      setSendingEmail(false);
    }
  };

  const handleCreateMeeting = async (values: MeetingFormValues) => {
    setCreatingMeeting(true);
    try {
      const startTime = values.startTime.toISOString();
      const endTime = values.startTime.add(values.durationMinutes, "minute").toISOString();
      const { joinUrl } = await microsoftApi.createTeamsMeeting(lead.id, values.subject, startTime, endTime);
      message.success("Teams meeting created");
      meetingForm.resetFields();
      setMeetingOpen(false);
      Modal.success({
        title: "Teams meeting created",
        content: (
          <a href={joinUrl} target="_blank" rel="noreferrer">
            {joinUrl}
          </a>
        ),
      });
    } catch {
      message.error("Failed to create Teams meeting");
    } finally {
      setCreatingMeeting(false);
    }
  };

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
        <Tooltip title={!microsoftConnected ? NOT_CONNECTED_TOOLTIP : !lead.email ? "This lead has no email address on file" : ""}>
          <Button icon={<MailOutlined />} disabled={!microsoftConnected || !lead.email} onClick={() => setEmailOpen(true)}>
            Email
          </Button>
        </Tooltip>
        <Tooltip title="WhatsApp integration is out of scope for now">
          <Button icon={<WhatsAppOutlined />} disabled>
            WhatsApp
          </Button>
        </Tooltip>
        <Tooltip title={!microsoftConnected ? NOT_CONNECTED_TOOLTIP : ""}>
          <Button icon={<TeamOutlined />} disabled={!microsoftConnected} onClick={() => setMeetingOpen(true)}>
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

      <Modal
        title={`Email ${lead.fullName}`}
        open={emailOpen}
        onCancel={() => setEmailOpen(false)}
        onOk={() => emailForm.submit()}
        okText="Send"
        confirmLoading={sendingEmail}
      >
        <Text type="secondary">To: {lead.email}</Text>
        <Form form={emailForm} layout="vertical" onFinish={handleSendEmail} style={{ marginTop: 12 }}>
          <Form.Item name="subject" label="Subject" rules={[{ required: true, message: "Subject is required" }]}>
            <Input />
          </Form.Item>
          <Form.Item name="body" label="Message" rules={[{ required: true, message: "Message is required" }]}>
            <Input.TextArea rows={6} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={`Schedule Teams meeting with ${lead.fullName}`}
        open={meetingOpen}
        onCancel={() => setMeetingOpen(false)}
        onOk={() => meetingForm.submit()}
        okText="Create meeting"
        confirmLoading={creatingMeeting}
      >
        <Form
          form={meetingForm}
          layout="vertical"
          onFinish={handleCreateMeeting}
          initialValues={{ startTime: dayjs().add(1, "hour").minute(0), durationMinutes: 30 }}
        >
          <Form.Item name="subject" label="Subject" rules={[{ required: true, message: "Subject is required" }]}>
            <Input placeholder={`Call with ${lead.fullName}`} />
          </Form.Item>
          <Form.Item name="startTime" label="Start time" rules={[{ required: true, message: "Start time is required" }]}>
            <DatePicker showTime style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="durationMinutes" label="Duration">
            <Select
              options={[
                { value: 15, label: "15 minutes" },
                { value: 30, label: "30 minutes" },
                { value: 60, label: "1 hour" },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
