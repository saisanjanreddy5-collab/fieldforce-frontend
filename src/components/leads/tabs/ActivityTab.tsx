import { useEffect, useState } from "react";
import { Button, DatePicker, Empty, Form, Input, Modal, Select, Spin, Typography, message } from "antd";
import dayjs from "dayjs";
import * as activityApi from "../../../api/activity-api";
import type { Activity, ActivityType } from "../../../types/activity";
import { formatDateTime } from "../../../utils/lead-format";

const { Text, Title } = Typography;

const TYPE_LABEL: Record<ActivityType, string> = {
  call: "Call",
  email: "Email",
  teams_meeting: "Teams Meeting",
  site_visit: "Site Visit",
};

interface NewActionFormValues {
  type: ActivityType;
  subject: string;
  dueDate: dayjs.Dayjs;
}

interface ActivityTabProps {
  leadId: string;
}

export function ActivityTab({ leadId }: ActivityTabProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm<NewActionFormValues>();

  const load = () => {
    setLoading(true);
    activityApi
      .listActivitiesForLead(leadId)
      .then(setActivities)
      .catch(() => message.error("Failed to load activities"))
      .finally(() => setLoading(false));
  };

  useEffect(load, [leadId]);

  const handleCreate = async (values: NewActionFormValues) => {
    setSubmitting(true);
    try {
      await activityApi.createActivityForLead(leadId, {
        type: values.type,
        subject: values.subject,
        dueDate: values.dueDate.toISOString(),
      });
      message.success("Action added");
      setModalOpen(false);
      form.resetFields();
      load();
    } catch {
      message.error("Failed to add action");
    } finally {
      setSubmitting(false);
    }
  };

  const markDone = async (activity: Activity) => {
    try {
      await activityApi.updateActivity(activity.id, { status: "completed" });
      load();
    } catch {
      message.error("Failed to update action");
    }
  };

  const scheduled = activities
    .filter((a) => a.status !== "completed")
    .sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? ""));
  const overdueCount = scheduled.filter((a) => a.dueDate && dayjs(a.dueDate).isBefore(dayjs())).length;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
        <div>
          <Title level={5} style={{ margin: 0 }}>
            Scheduled actions
          </Title>
          <Text type="secondary">
            {scheduled.length} planned · {overdueCount} overdue
          </Text>
        </div>
        <Button type="primary" onClick={() => setModalOpen(true)}>
          + Add action
        </Button>
      </div>

      {loading ? (
        <Spin />
      ) : scheduled.length === 0 ? (
        <Empty description="Nothing scheduled" />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {scheduled.map((activity) => {
            const isOverdue = activity.dueDate ? dayjs(activity.dueDate).isBefore(dayjs()) : false;
            return (
              <div
                key={activity.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "10px 12px",
                  border: isOverdue ? "1px solid #e34948" : "1px solid #f0f0f0",
                  borderRadius: 8,
                  flexWrap: "wrap",
                  gap: 8,
                }}
              >
                <div>
                  <Text strong>{activity.subject ?? TYPE_LABEL[activity.type]}</Text>
                  <div>
                    <Text type={isOverdue ? "danger" : "secondary"} style={{ fontSize: 12 }}>
                      {TYPE_LABEL[activity.type]} · {formatDateTime(activity.dueDate)}
                      {isOverdue ? " · Overdue" : ""}
                    </Text>
                  </div>
                </div>
                <Button size="small" onClick={() => markDone(activity)}>
                  Done
                </Button>
              </div>
            );
          })}
        </div>
      )}

      <Modal
        title="Add action"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        okButtonProps={{ loading: submitting }}
      >
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Form.Item name="type" label="Type" rules={[{ required: true }]}>
            <Select
              options={[
                { value: "call", label: "Call" },
                { value: "email", label: "Email" },
                { value: "teams_meeting", label: "Teams Meeting" },
                { value: "site_visit", label: "Site Visit" },
              ]}
            />
          </Form.Item>
          <Form.Item name="subject" label="Subject" rules={[{ required: true }]}>
            <Input placeholder="e.g. Proposal review with RSM" />
          </Form.Item>
          <Form.Item name="dueDate" label="When" rules={[{ required: true }]}>
            <DatePicker showTime style={{ width: "100%" }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
