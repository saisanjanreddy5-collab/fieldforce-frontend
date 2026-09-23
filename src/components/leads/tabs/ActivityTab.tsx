import { useState } from "react";
import { Button, DatePicker, Form, Input, Modal, Select, Spin, Typography, message } from "antd";
import dayjs from "dayjs";
import * as activityApi from "../../../api/activity-api";
import type { Activity, ActivityType } from "../../../types/activity";
import { formatDateTime } from "../../../utils/lead-format";
import { TYPE_LABEL, TypeBadge } from "../../../utils/activity-shared";
import { useHasPermission } from "../../../hooks/use-permission";

const { Text, Title } = Typography;

interface NewActionFormValues {
  type: ActivityType;
  subject: string;
  dueDate: dayjs.Dayjs;
}

interface ActivityTabProps {
  leadId: string;
  activities: Activity[];
  loading: boolean;
  onChanged: () => void;
}

// Scheduled/upcoming actions only - what needs to happen next for this lead.
// Historical, already-completed interactions live in the separate Logs tab
// instead, matching the reference's split rather than one merged feed.
export function ActivityTab({ leadId, activities, loading, onChanged }: ActivityTabProps) {
  const hasPermission = useHasPermission();
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm<NewActionFormValues>();

  const upcoming = activities
    .filter((a) => a.status !== "completed")
    .sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? ""));
  const overdueCount = upcoming.filter((a) => a.dueDate && dayjs(a.dueDate).isBefore(dayjs())).length;
  const next = upcoming[0];

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
      onChanged();
    } catch {
      message.error("Failed to add action");
    } finally {
      setSubmitting(false);
    }
  };

  const markDone = async (activity: Activity) => {
    try {
      await activityApi.updateActivity(activity.id, { status: "completed" });
      onChanged();
    } catch {
      message.error("Failed to update action");
    }
  };

  if (loading) return <Spin />;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
        <div>
          <Title level={5} style={{ margin: 0 }}>
            Scheduled actions
          </Title>
          <Text type="secondary">
            {upcoming.length} planned · {overdueCount} overdue
            {next ? ` · next is ${TYPE_LABEL[next.type].toLowerCase()} ${formatDateTime(next.dueDate)}` : ""}
          </Text>
        </div>
        {hasPermission("activities.create") && (
          <Button type="primary" onClick={() => setModalOpen(true)}>
            + Add action
          </Button>
        )}
      </div>

      {upcoming.length === 0 ? (
        <Text type="secondary">Nothing scheduled - add an action to plan the next follow-up</Text>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {upcoming.map((activity) => {
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
                  gap: 10,
                }}
              >
                <div style={{ display: "flex", gap: 10, alignItems: "center", minWidth: 0 }}>
                  <TypeBadge type={activity.type} />
                  <div style={{ minWidth: 0 }}>
                    <Text strong>{activity.subject ?? TYPE_LABEL[activity.type]}</Text>
                    <div>
                      <Text type={isOverdue ? "danger" : "secondary"} style={{ fontSize: 12 }}>
                        {TYPE_LABEL[activity.type]} · {formatDateTime(activity.dueDate)}
                        {isOverdue ? " · Overdue" : ""}
                      </Text>
                    </div>
                  </div>
                </div>
                {hasPermission("activities.update") && (
                  <Button size="small" onClick={() => markDone(activity)}>
                    Done
                  </Button>
                )}
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
