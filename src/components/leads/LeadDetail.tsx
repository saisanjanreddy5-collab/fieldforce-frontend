import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { App, DatePicker, Form, Input, Modal, Select, Typography, message as staticMessage } from "antd";
import { isAxiosError } from "axios";
import dayjs, { type Dayjs } from "dayjs";
import type { Lead } from "../../types/lead";
import type { Opportunity } from "../../types/opportunity";
import type { Activity } from "../../types/activity";
import type { FofoHandoff } from "../../types/fofo-onboarding";
import * as microsoftApi from "../../api/microsoft-api";
import * as smartfloApi from "../../api/smartflo-api";
import * as opportunityApi from "../../api/opportunity-api";
import * as activityApi from "../../api/activity-api";
import * as fofoOnboardingApi from "../../api/fofo-onboarding-api";
import { useMicrosoftConnection } from "../../hooks/use-microsoft-connection";
import { useHasPermission } from "../../hooks/use-permission";
import { useAuth } from "../../context/AuthContext";
import { ScrollableTabBar } from "../ScrollableTabBar";
import { LeadSnapshot } from "./LeadSnapshot";
import { OverviewTab } from "./tabs/OverviewTab";
import { OpportunitiesTab } from "./tabs/OpportunitiesTab";
import { ActivityTab } from "./tabs/ActivityTab";
import { LogsTab } from "./tabs/LogsTab";
import { ConsentTab } from "./tabs/ConsentTab";
import { ApprovalsTab } from "./tabs/ApprovalsTab";
import { DocumentsTab } from "./tabs/DocumentsTab";

const { Text } = Typography;

interface LeadDetailProps {
  lead: Lead;
  showOwner: boolean;
  onEdit: () => void;
}

const DETAIL_TABS = [
  { key: "overview", label: "Overview" },
  { key: "opportunities", label: "Opportunities" },
  { key: "activity", label: "Activity" },
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

function errorMessageFrom(err: unknown, fallback: string): string {
  return isAxiosError<{ message?: string }>(err) && err.response?.data.message ? err.response.data.message : fallback;
}

export function LeadDetail({ lead, showOwner, onEdit }: LeadDetailProps) {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const hasPermission = useHasPermission();
  const { user } = useAuth();
  const { connected: microsoftConnected } = useMicrosoftConnection();
  const [activeTabKey, setActiveTabKey] = useState("overview");
  const [emailOpen, setEmailOpen] = useState(false);
  const [meetingOpen, setMeetingOpen] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [creatingMeeting, setCreatingMeeting] = useState(false);
  const [calling, setCalling] = useState(false);
  const [emailForm] = Form.useForm<EmailFormValues>();
  const [meetingForm] = Form.useForm<MeetingFormValues>();

  // Fetched once here, not inside OpportunitiesTab - needed for the
  // computed primary action (an "open opportunity" is one input to it) as
  // well as the tab content, so lifting it up avoids fetching the same
  // list twice for one lead selection.
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [opportunitiesLoading, setOpportunitiesLoading] = useState(true);

  const loadOpportunities = () => {
    setOpportunitiesLoading(true);
    opportunityApi
      .listOpportunitiesForLead(lead.id)
      .then(setOpportunities)
      .catch(() => staticMessage.error("Failed to load opportunities"))
      .finally(() => setOpportunitiesLoading(false));
  };

  // Fetched once here (not inside ApprovalsTab/DocumentsTab) so switching
  // between those two tabs doesn't re-fetch the same handoff twice - same
  // "lift the fetch" pattern already used for opportunities above. Only
  // fetched for FOFO leads the user is actually permitted to see, since the
  // backend route itself is gated behind fofo_onboarding.view.
  const canViewOnboarding = lead.category === "FOFO" && hasPermission("fofo_onboarding.view");
  const [handoff, setHandoff] = useState<FofoHandoff | null>(null);
  const [handoffLoading, setHandoffLoading] = useState(canViewOnboarding);

  const loadHandoff = () => {
    if (!canViewOnboarding) return;
    setHandoffLoading(true);
    fofoOnboardingApi
      .getHandoff(lead.id)
      .then(setHandoff)
      .catch(() => staticMessage.error("Failed to load approvals/documents"))
      .finally(() => setHandoffLoading(false));
  };

  // Fetched once here so the Activity (scheduled) and Logs (history) tabs
  // - split from what used to be one merged component - share the same
  // fetch instead of each requesting the same list separately.
  const [activities, setActivities] = useState<Activity[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(true);

  const loadActivities = () => {
    setActivitiesLoading(true);
    activityApi
      .listActivitiesForLead(lead.id)
      .then(setActivities)
      .catch(() => staticMessage.error("Failed to load activity"))
      .finally(() => setActivitiesLoading(false));
  };

  useEffect(() => {
    setActiveTabKey("overview");
    loadOpportunities();
    loadHandoff();
    loadActivities();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lead.id]);

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
    if (!user?.smartfloAgentNumber) {
      message.error("Set your calling number from your profile (top right) first");
      return;
    }
    Modal.confirm({
      title: `Call ${lead.fullName}?`,
      content: `Calling from ${user.smartfloAgentNumber} to ${lead.phone}. Your phone rings first - answer it to connect.`,
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

  const canOnboard = lead.category === "FOFO" && hasPermission("fofo_onboarding.view");
  const hasOpenOpportunity = opportunities.some((o) => o.stage !== "won" && o.stage !== "lost");

  return (
    <div>
      <LeadSnapshot
        lead={lead}
        showOwner={showOwner}
        availability={{
          canOnboard,
          hasOpenOpportunity,
          canAddActivity: hasPermission("activities.create"),
          canCall: Boolean(lead.phone),
          canEditLead: hasPermission("leads.update"),
        }}
        calling={calling}
        microsoftConnected={microsoftConnected}
        onCall={handleCall}
        onEmail={() => setEmailOpen(true)}
        onTeamsMeeting={() => setMeetingOpen(true)}
        onEdit={onEdit}
        onOnboard={() => navigate(`/fofo-onboarding/${lead.id}`)}
        onAddActivity={() => setActiveTabKey("activity")}
      />

      <div style={{ marginTop: 16 }}>
        <ScrollableTabBar items={DETAIL_TABS} activeKey={activeTabKey} onChange={setActiveTabKey} />
        <div style={{ marginTop: 16 }}>
          {activeTabKey === "overview" && <OverviewTab lead={lead} />}
          {activeTabKey === "opportunities" && (
            <OpportunitiesTab leadId={lead.id} opportunities={opportunities} loading={opportunitiesLoading} onChanged={loadOpportunities} />
          )}
          {activeTabKey === "activity" && (
            <ActivityTab leadId={lead.id} activities={activities} loading={activitiesLoading} onChanged={loadActivities} />
          )}
          {activeTabKey === "logs" && <LogsTab activities={activities} loading={activitiesLoading} />}
          {activeTabKey === "consent" && <ConsentTab leadId={lead.id} />}
          {activeTabKey === "approvals" && (
            <ApprovalsTab lead={lead} canView={canViewOnboarding} loading={handoffLoading} handoff={handoff} onChanged={loadHandoff} />
          )}
          {activeTabKey === "documents" && (
            <DocumentsTab lead={lead} canView={canViewOnboarding} loading={handoffLoading} handoff={handoff} onChanged={loadHandoff} />
          )}
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
