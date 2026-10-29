import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { App, DatePicker, Form, Input, Modal, Select, Typography, message as staticMessage } from "antd";
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
import { errorMessageFrom } from "../../utils/api-error";
import { ScrollableTabBar } from "../ScrollableTabBar";
import { LeadSnapshot } from "./LeadSnapshot";
import { LeadAssignmentPanel } from "./LeadAssignmentPanel";
import { CallCenterStageActions } from "./CallCenterStageActions";
import { OverviewTab } from "./tabs/OverviewTab";
import { OpportunitiesTab } from "./tabs/OpportunitiesTab";
import { ActivityTab } from "./tabs/ActivityTab";
import { WhatsAppTab } from "./tabs/WhatsAppTab";
import { HistoryTab } from "./tabs/HistoryTab";
import { ConsentTab } from "./tabs/ConsentTab";
import { ApprovalsTab } from "./tabs/ApprovalsTab";
import { DocumentsTab } from "./tabs/DocumentsTab";
import { EmailComposeDrawer } from "../calendar/EmailComposeDrawer";

const { Text } = Typography;

interface LeadDetailProps {
  lead: Lead;
  showOwner: boolean;
  onEdit: () => void;
  initialTab?: string;
  // Re-fetches the lead list so this lead's owner/status reflect a change
  // made right here (Send to Field Sales, Reassign) - optional since not
  // every place that renders LeadDetail needs this (e.g. a read-only embed).
  onLeadUpdated?: () => void;
}

const BASE_DETAIL_TABS = [
  { key: "overview", label: "Overview" },
  { key: "opportunities", label: "Opportunities" },
  { key: "history", label: "History" },
  { key: "activity", label: "Activity" },
  { key: "whatsapp", label: "WhatsApp" },
  { key: "consent", label: "Consent" },
  { key: "approvals", label: "Approvals" },
  { key: "documents", label: "Documents" },
];

// Which permission a tab actually needs, matching the real route guard
// behind it (see lead-routes.ts) - null means every authenticated viewer of
// this lead can see it. Without this, a role missing one of these (Call
// Center holds neither opportunities.view nor leads.view, by design - see
// role-permission-service.ts) would still see the tab, click it, and get a
// 403 toast instead of the tab just not being there. History deliberately
// has no entry here - every call center/field/admin person who can open
// this lead at all needs to see its full history. Approvals/Documents
// aren't listed here either - they're already gated inline via
// canViewOnboarding below, which the same fofo_onboarding.view permission
// backs.
const TAB_PERMISSION: Partial<Record<string, string>> = {
  opportunities: "opportunities.view",
  whatsapp: "whatsapp.view",
  consent: "leads.view",
};

interface MeetingFormValues {
  subject: string;
  startTime: Dayjs;
  durationMinutes: number;
}

export function LeadDetail({ lead, showOwner, onEdit, initialTab, onLeadUpdated }: LeadDetailProps) {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const hasPermission = useHasPermission();
  const { user } = useAuth();
  const { connected: microsoftConnected } = useMicrosoftConnection();

  // Shared with detailTabs below - the one place that decides whether a tab
  // key is actually reachable. Without this, initialTab coming straight from
  // a URL's ?tab= query param (see LeadsPage.tsx's deep-link handling) could
  // seed activeTabKey with a tab the viewer has no permission for, bypassing
  // the tab bar's own filtering entirely and landing them on a tab whose
  // content fetches and 403s on mount - exactly what that filtering exists
  // to prevent.
  const isTabAllowed = (key: string): boolean => {
    const required = TAB_PERMISSION[key];
    return !required || hasPermission(required);
  };

  // A lazy initializer, not a prop read directly in the effect below - this
  // only ever seeds the very first mount (e.g. a fresh deep link from the
  // Activity calendar's WhatsApp button landing straight on that tab).
  // Every subsequent lead switch after that goes through the effect below,
  // which always resets to "overview" regardless of this prop's value -
  // otherwise a stale initialTab would keep pulling every later lead
  // selection back to the same tab instead of behaving normally.
  const [activeTabKey, setActiveTabKey] = useState(initialTab && isTabAllowed(initialTab) ? initialTab : "overview");
  const [emailOpen, setEmailOpen] = useState(false);
  const [meetingOpen, setMeetingOpen] = useState(false);
  const [creatingMeeting, setCreatingMeeting] = useState(false);
  const [calling, setCalling] = useState(false);
  const [meetingForm] = Form.useForm<MeetingFormValues>();

  // Fetched once here, not inside OpportunitiesTab - needed for the
  // computed primary action (an "open opportunity" is one input to it) as
  // well as the tab content, so lifting it up avoids fetching the same
  // list twice for one lead selection.
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [opportunitiesLoading, setOpportunitiesLoading] = useState(true);

  const canViewOpportunities = hasPermission("opportunities.view");
  const loadOpportunities = () => {
    // Call Center holds neither opportunities.view nor quotes.view by design
    // (see role-permission-service.ts) - fetching this anyway, just to feed
    // a tab they'll never see, was exactly what produced a "Failed to load
    // opportunities" toast on every single lead they opened.
    if (!canViewOpportunities) {
      setOpportunitiesLoading(false);
      return;
    }
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

  const isFirstRender = useRef(true);
  useEffect(() => {
    // Skip the reset on the very first run - activeTabKey's own initializer
    // already seeded it correctly (see above), and resetting here too would
    // immediately stomp a deep-linked initialTab back to "overview" before
    // the user ever saw it.
    if (isFirstRender.current) {
      isFirstRender.current = false;
    } else {
      setActiveTabKey("overview");
    }
    loadOpportunities();
    loadHandoff();
    loadActivities();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lead.id]);

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

  const pendingActivityCount = activities.filter((a) => a.status !== "completed").length;
  const detailTabs = BASE_DETAIL_TABS.filter((tab) => isTabAllowed(tab.key)).map((tab) =>
    tab.key === "activity" && pendingActivityCount > 0 ? { ...tab, badge: String(pendingActivityCount) } : tab
  );

  return (
    <div>
      <LeadSnapshot
        lead={lead}
        showOwner={showOwner}
        assignmentActions={
          <>
            <CallCenterStageActions lead={lead} onChanged={() => onLeadUpdated?.()} />
            <LeadAssignmentPanel lead={lead} onChanged={() => onLeadUpdated?.()} onViewHistory={() => setActiveTabKey("history")} />
          </>
        }
        availability={{
          canOnboard,
          hasOpenOpportunity,
          canAddActivity: hasPermission("activities.create"),
          canCall: Boolean(lead.phone) && lead.inOwnerScope,
          canEditLead: hasPermission("leads.update") && lead.inOwnerScope,
        }}
        calling={calling}
        microsoftConnected={microsoftConnected}
        onCall={handleCall}
        onEmail={() => setEmailOpen(true)}
        onTeamsMeeting={() => setMeetingOpen(true)}
        onEdit={onEdit}
        onOnboard={() => navigate(`/fofo-onboarding/${lead.id}`)}
        onAddActivity={() => setActiveTabKey("activity")}
        onWhatsApp={() => setActiveTabKey("whatsapp")}
      />

      <div style={{ marginTop: 16 }}>
        <ScrollableTabBar items={detailTabs} activeKey={activeTabKey} onChange={setActiveTabKey} />
        <div style={{ marginTop: 16 }}>
          {activeTabKey === "overview" && <OverviewTab lead={lead} />}
          {activeTabKey === "opportunities" && (
            <OpportunitiesTab leadId={lead.id} opportunities={opportunities} loading={opportunitiesLoading} onChanged={loadOpportunities} />
          )}
          {activeTabKey === "activity" && (
            <ActivityTab leadId={lead.id} activities={activities} loading={activitiesLoading} onChanged={loadActivities} />
          )}
          {activeTabKey === "whatsapp" && (
            <WhatsAppTab leadId={lead.id} fullName={lead.fullName} phone={lead.phone} canSend={lead.inOwnerScope} />
          )}
          {activeTabKey === "history" && <HistoryTab leadId={lead.id} />}
          {activeTabKey === "consent" && <ConsentTab leadId={lead.id} />}
          {activeTabKey === "approvals" && (
            <ApprovalsTab lead={lead} canView={canViewOnboarding} loading={handoffLoading} handoff={handoff} onChanged={loadHandoff} />
          )}
          {activeTabKey === "documents" && (
            <DocumentsTab lead={lead} canView={canViewOnboarding} loading={handoffLoading} handoff={handoff} onChanged={loadHandoff} />
          )}
        </div>
      </div>

      <EmailComposeDrawer
        open={emailOpen}
        onClose={() => setEmailOpen(false)}
        leadId={lead.id}
        activityDueDate={null}
        onSent={() => setEmailOpen(false)}
      />

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
