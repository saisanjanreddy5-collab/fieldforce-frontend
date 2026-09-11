import { useEffect, useState } from "react";
import { Button, Empty, Input, Spin, Tag, Tooltip, Typography, message } from "antd";
import { MailOutlined, PhoneOutlined, PlayCircleOutlined, ShopOutlined, TeamOutlined } from "@ant-design/icons";
import * as activityApi from "../../../api/activity-api";
import type { Activity, ActivityComment, ActivityType } from "../../../types/activity";
import { formatDateTime } from "../../../utils/lead-format";

const { Text, Title } = Typography;

const TYPE_LABEL: Record<ActivityType, string> = {
  call: "Call",
  email: "Email",
  teams_meeting: "Teams Meeting",
  site_visit: "Site Visit",
};

const TYPE_ICON: Record<ActivityType, React.ReactNode> = {
  call: <PhoneOutlined style={{ color: "#0ca30c" }} />,
  email: <MailOutlined style={{ color: "#2a78d6" }} />,
  teams_meeting: <TeamOutlined style={{ color: "#4a3aa7" }} />,
  site_visit: <ShopOutlined style={{ color: "#eda100" }} />,
};

interface LogsTabProps {
  leadId: string;
}

function CommentThread({ activityId }: { activityId: string }) {
  const [comments, setComments] = useState<ActivityComment[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);

  const load = () => {
    activityApi
      .listComments(activityId)
      .then(setComments)
      .catch(() => message.error("Failed to load comments"))
      .finally(() => setLoading(false));
  };

  useEffect(load, [activityId]);

  const submit = async () => {
    if (!draft.trim()) return;
    setPosting(true);
    try {
      await activityApi.addComment(activityId, draft.trim());
      setDraft("");
      load();
    } catch {
      message.error("Failed to add comment");
    } finally {
      setPosting(false);
    }
  };

  if (loading) return null;

  return (
    <div style={{ marginTop: 8, paddingLeft: 12, borderLeft: "2px solid #f0f0f0" }}>
      {comments.map((comment) => (
        <div key={comment.id} style={{ marginBottom: 6 }}>
          <Text style={{ fontSize: 13 }}>{comment.comment}</Text>
          <div>
            <Text type="secondary" style={{ fontSize: 11 }}>
              {formatDateTime(comment.createdAt)}
            </Text>
          </div>
        </div>
      ))}
      <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
        <Input
          size="small"
          placeholder="Write a comment for the team..."
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onPressEnter={submit}
        />
        <Button size="small" onClick={submit} loading={posting}>
          Add
        </Button>
      </div>
    </div>
  );
}

function ActivityCard({ activity }: { activity: Activity }) {
  const outcome = typeof activity.details.outcome === "string" ? activity.details.outcome : undefined;
  const recordingUrl = typeof activity.details.recordingUrl === "string" ? activity.details.recordingUrl : undefined;
  const transcriptUrl = typeof activity.details.transcriptUrl === "string" ? activity.details.transcriptUrl : undefined;

  return (
    <div style={{ borderBottom: "1px solid #f0f0f0", paddingBottom: 12 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "baseline", flexWrap: "wrap" }}>
        {TYPE_ICON[activity.type]}
        <Tag>{TYPE_LABEL[activity.type]}</Tag>
        <Text strong>{activity.subject ?? TYPE_LABEL[activity.type]}</Text>
        <Text type="secondary" style={{ fontSize: 12 }}>
          {formatDateTime(activity.updatedAt)}
        </Text>
      </div>

      {outcome && (
        <Text type="secondary" style={{ fontSize: 13, display: "block", marginTop: 4 }}>
          {outcome}
        </Text>
      )}

      {activity.type === "call" && (
        <div style={{ marginTop: 6 }}>
          {recordingUrl ? (
            <a href={recordingUrl} target="_blank" rel="noreferrer">
              <PlayCircleOutlined /> Recording
            </a>
          ) : (
            <Tooltip title="Recording will appear here once the telephony integration is connected">
              <Text type="secondary" style={{ fontSize: 12 }}>
                <PlayCircleOutlined /> Recording (not connected yet)
              </Text>
            </Tooltip>
          )}
        </div>
      )}

      {activity.type === "teams_meeting" && (
        <div style={{ marginTop: 6 }}>
          {transcriptUrl ? (
            <a href={transcriptUrl} target="_blank" rel="noreferrer">
              Transcript — Teams Maestro AI
            </a>
          ) : (
            <Tooltip title="Transcript will appear here once Microsoft 365 is connected">
              <Text type="secondary" style={{ fontSize: 12 }}>
                Transcript (not connected yet)
              </Text>
            </Tooltip>
          )}
        </div>
      )}

      <CommentThread activityId={activity.id} />
    </div>
  );
}

export function LogsTab({ leadId }: LogsTabProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    activityApi
      .listActivitiesForLead(leadId)
      .then((all) => setActivities(all.filter((a) => a.status === "completed")))
      .catch(() => message.error("Failed to load logs"))
      .finally(() => setLoading(false));
  }, [leadId]);

  if (loading) return <Spin />;

  return (
    <div>
      <Title level={5} style={{ marginTop: 0 }}>
        {activities.length} of {activities.length} interactions
      </Title>

      {activities.length === 0 ? (
        <Empty description="No interactions logged yet" />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {activities.map((activity) => (
            <ActivityCard key={activity.id} activity={activity} />
          ))}
        </div>
      )}
    </div>
  );
}
