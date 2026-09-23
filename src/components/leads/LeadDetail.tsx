import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { App, Avatar, Button, DatePicker, Form, Input, Modal, Progress, Select, Tag, Tooltip, Typography } from "antd";
import { CloudUploadOutlined, EditOutlined, MailOutlined, PhoneOutlined, TeamOutlined, WhatsAppOutlined } from "@ant-design/icons";
import { isAxiosError } from "axios";
import dayjs, { type Dayjs } from "dayjs";
import type { Lead } from "../../types/lead";
import { initials, scoreColor } from "../../utils/lead-format";
import { useMicrosoftConnection } from "../../hooks/use-microsoft-connection";
import { useHasPermission } from "../../hooks/use-permission";
import * as microsoftApi from "../../api/microsoft-api";
import * as smartfloApi from "../../api/smartflo-api";
import { ScrollableTabBar } from "../ScrollableTabBar";
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

const DETAIL_TABS = [
  { key: "overview", label: "Overview" },
  { key: "opportunities", label: "Opportunities" },
  { key: "activity", label: "Activity & calls" },
  { key: "logs", label: "Logs" },
  { key: "consent", label: "Consent" },
  { key: "approvals", label: "Approvals" },
  { key: "documents", label: "Documents" },
];

interface EmailFormValues {
  subject: string;
  body: string;
}

interface MeetingFormValues {
  subject: string;
  startTime: Dayjs;
  durationMinutes: number;
}

const NOT_CONNECTED_TOOLTIP = "Connect your Microsoft 365 account under Sales force management first";

function errorMessageFrom(err: unknown, fallback: string): string {
  return isAxiosError<{ message?: string }>(err) && err.response?.data.message ? err.response.data.message : fallback;
}

export function LeadDetail({ lead, onEdit }: LeadDetailProps) {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const hasPermission = useHasPermission();
  const { connected: microsoftConnected } = useMicrosoftConnection();
  const [activeTabKey, setActiveTabKey] = useState("overview");
  const [emailOpen, setEmailOpen] = useState(false);
  const [meetingOpen, setMeetingOpen] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [creatingMeeting, setCreatingMeeting] = useState(false);
  const [calling, setCalling] = useState(false);
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
    } catch (err) {
      message.error(errorMessageFrom(err, "Failed to send email"));
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
    } catch (err) {
      message.error(errorMessageFrom(err, "Failed to create Teams meeting"));
    } finally {
      setCreatingMeeting(false);
    }
  };

  const handleCall = () => {
    Modal.confirm({
      title: `Call ${lead.fullName}?`,
      content: `This will ring your own registered phone first, then connect you to ${lead.phone}.`,
      okText: "Call now",
      onOk: async () => {
        setCalling(true);
        try {
          await smartfloApi.callLead(lead.id);
          message.success("Call started - answer your phone to connect");
        } catch (err) {
          message.error(errorMessageFrom(err, "Failed to start call"));
        } finally {
          setCalling(false);
        }
      },
    });
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
        <Tooltip title={!lead.phone ? "This lead has no phone number on file" : ""}>
          <Button icon={<PhoneOutlined />} disabled={!lead.phone} loading={calling} onClick={handleCall}>
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
        <Tooltip title={!microsoftConnected ? NOT_CONNECTED_TOOLTIP : !lead.email ? "This lead has no email address on file" : ""}>
          <Button icon={<TeamOutlined />} disabled={!microsoftConnected || !lead.email} onClick={() => setMeetingOpen(true)}>
            Teams meeting
          </Button>
        </Tooltip>
        {hasPermission("leads.update") && (
          <Button icon={<EditOutlined />} onClick={onEdit}>
            Edit lead
          </Button>
        )}
        <Tooltip title={lead.category !== "FOFO" ? "Onboarding handoff is only for FOFO-category leads" : ""}>
          <Button
            type="primary"
            icon={<CloudUploadOutlined />}
            disabled={lead.category !== "FOFO" || !hasPermission("fofo_onboarding.view")}
            onClick={() => navigate(`/fofo-onboarding/${lead.id}`)}
          >
            Onboard
          </Button>
        </Tooltip>
      </div>

      <div style={{ marginTop: 16 }}>
        <ScrollableTabBar items={DETAIL_TABS} activeKey={activeTabKey} onChange={setActiveTabKey} />
        <div style={{ marginTop: 16 }}>
          {activeTabKey === "overview" && <OverviewTab lead={lead} />}
          {activeTabKey === "opportunities" && <OpportunitiesTab leadId={lead.id} />}
          {activeTabKey === "activity" && <ActivityTab leadId={lead.id} />}
          {activeTabKey === "logs" && <LogsTab leadId={lead.id} />}
          {activeTabKey === "consent" && <ConsentTab leadId={lead.id} />}
          {activeTabKey === "approvals" && <ApprovalsTab />}
          {activeTabKey === "documents" && <DocumentsTab />}
        </div>
      </div>

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
        <Text type="secondary">Inviting: {lead.email}</Text>
        <Form
          form={meetingForm}
          layout="vertical"
          onFinish={handleCreateMeeting}
          initialValues={{ startTime: dayjs().add(1, "hour").minute(0), durationMinutes: 30 }}
          style={{ marginTop: 12 }}
        >
          <Form.Item name="subject" label="Subject" rules={[{ required: true, message: "Subject is required" }]}>
            <Input placeholder={`Call with ${lead.fullName}`} />
          </Form.Item>
          <Form.Item name="startTime" label="Start time" rules={[{ required: true, message: "Start time is required" }]}>
            <DatePicker
              showTime
              style={{ width: "100%" }}
              styles={{ popup: { body: { maxHeight: 200, overflowY: "auto" } } }}
            />
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
