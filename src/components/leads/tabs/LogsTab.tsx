import { useEffect, useMemo, useState } from "react";
import { Button, Checkbox, Dropdown, Empty, Input, Spin, Tag, Tooltip, Typography, message } from "antd";
import { DownOutlined, MailOutlined, PhoneOutlined, PlayCircleOutlined, ShopOutlined, TeamOutlined } from "@ant-design/icons";
import * as activityApi from "../../../api/activity-api";
import type { Activity, ActivityComment, ActivityType } from "../../../types/activity";
import { formatDateTime, formatDurationSeconds } from "../../../utils/lead-format";

const { Text } = Typography;

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

const TYPE_DOT_COLOR: Record<ActivityType, string> = {
  call: "#0ca30c",
  email: "#2a78d6",
  teams_meeting: "#4a3aa7",
  site_visit: "#eda100",
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
  const durationSeconds =
    typeof activity.details.durationSeconds === "number" ? activity.details.durationSeconds : undefined;
  const transcriptUrl = typeof activity.details.transcriptUrl === "string" ? activity.details.transcriptUrl : undefined;
  const emailBody = typeof activity.details.body === "string" ? activity.details.body : undefined;
  const joinUrl = typeof activity.details.joinUrl === "string" ? activity.details.joinUrl : undefined;

  return (
    <div style={{ border: "1px solid #f0f0f0", borderRadius: 8, padding: 12, boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}>
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
              {durationSeconds !== undefined ? ` · ${formatDurationSeconds(durationSeconds)}` : ""}
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

      {activity.type === "email" && emailBody && (
        <div style={{ marginTop: 6, padding: 8, background: "#fafafa", borderRadius: 6, border: "1px solid #f0f0f0" }}>
          <Text style={{ fontSize: 13, whiteSpace: "pre-wrap" }}>{emailBody}</Text>
        </div>
      )}

      {activity.type === "teams_meeting" && (
        <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 4 }}>
          {joinUrl && (
            <a href={joinUrl} target="_blank" rel="noreferrer">
              Join link
            </a>
          )}
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

const ALL_TYPES: ActivityType[] = ["email", "call", "teams_meeting", "site_visit"];

export function LogsTab({ leadId }: LogsTabProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTypes, setSelectedTypes] = useState<Set<ActivityType>>(new Set());
  const [typeSearch, setTypeSearch] = useState("");

  useEffect(() => {
    setLoading(true);
    activityApi
      .listActivitiesForLead(leadId)
      .then((all) => setActivities(all.filter((a) => a.status === "completed")))
      .catch(() => message.error("Failed to load logs"))
      .finally(() => setLoading(false));
  }, [leadId]);

  const typeCounts = useMemo(() => {
    const counts: Record<ActivityType, number> = { email: 0, call: 0, teams_meeting: 0, site_visit: 0 };
    for (const activity of activities) counts[activity.type] += 1;
    return counts;
  }, [activities]);

  // Empty selection means "no filter applied" - show everything.
  const filteredActivities =
    selectedTypes.size === 0 ? activities : activities.filter((a) => selectedTypes.has(a.type));

  const toggleType = (type: ActivityType) => {
    setSelectedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  const filterLabel =
    selectedTypes.size === 0
      ? "All communication"
      : Array.from(selectedTypes)
          .map((t) => TYPE_LABEL[t])
          .join(", ");

  if (loading) return <Spin />;

  const visibleTypes = ALL_TYPES.filter((type) => TYPE_LABEL[type].toLowerCase().includes(typeSearch.toLowerCase()));

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
        <Dropdown
          trigger={["click"]}
          placement="bottomLeft"
          onOpenChange={(open) => {
            if (!open) setTypeSearch("");
          }}
          dropdownRender={() => (
            <div style={{ background: "#fff", borderRadius: 8, boxShadow: "0 4px 16px rgba(0,0,0,0.12)", padding: 12, minWidth: 240 }}>
              <Input
                size="small"
                placeholder="Search communication type"
                value={typeSearch}
                onChange={(e) => setTypeSearch(e.target.value)}
                style={{ marginBottom: 8 }}
              />
              {visibleTypes.map((type) => (
                <div key={type} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0" }}>
                  <Checkbox checked={selectedTypes.has(type)} onChange={() => toggleType(type)}>
                    <span
                      style={{
                        display: "inline-block",
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: TYPE_DOT_COLOR[type],
                        marginRight: 6,
                      }}
                    />
                    {TYPE_LABEL[type]}
                  </Checkbox>
                  <Text type="secondary">{typeCounts[type]}</Text>
                </div>
              ))}
              <div style={{ display: "flex", gap: 8, marginTop: 8, borderTop: "1px solid #f0f0f0", paddingTop: 8 }}>
                <Button size="small" onClick={() => setSelectedTypes(new Set(ALL_TYPES))}>
                  Select all
                </Button>
                <Button size="small" onClick={() => setSelectedTypes(new Set())}>
                  Clear
                </Button>
              </div>
            </div>
          )}
        >
          <Button size="small">
            <span style={{ color: "#898781", marginRight: 4 }}>TYPE</span>
            {filterLabel} <DownOutlined style={{ fontSize: 10 }} />
          </Button>
        </Dropdown>
        <Text type="secondary">
          {filteredActivities.length} of {activities.length} interactions
        </Text>
      </div>

      {filteredActivities.length === 0 ? (
        <Empty description="No interactions logged yet" style={{ marginTop: 16 }} />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 16 }}>
          {filteredActivities.map((activity) => (
            <ActivityCard key={activity.id} activity={activity} />
          ))}
        </div>
      )}
    </div>
  );
}
