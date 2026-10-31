import { useEffect, useMemo, useState } from "react";
import { Avatar, Badge, Button, Checkbox, Dropdown, Empty, Input, Modal, Segmented, Skeleton, Tag, Tooltip, Typography, message } from "antd";
import {
  DeleteOutlined,
  DownOutlined,
  EditOutlined,
  FileTextOutlined,
  MailOutlined,
  MessageOutlined,
  PlayCircleOutlined,
  RiseOutlined,
  SwapOutlined,
  TagsOutlined,
  UserSwitchOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import * as leadApi from "../../../api/lead-api";
import * as activityApi from "../../../api/activity-api";
import type { LeadTimelineEntry } from "../../../types/lead-timeline";
import type { Activity, ActivityType } from "../../../types/activity";
import type { AuditEvent } from "../../../types/audit-consent";
import { formatDateTime, initials, formatDurationSeconds } from "../../../utils/lead-format";
import { appTokens, avatarGradient } from "../../../utils/design-system";
import { ALL_ACTIVITY_TYPES, TYPE_DOT_COLOR, TYPE_ICON, TYPE_LABEL } from "../../../utils/activity-shared";
import { useHasPermission } from "../../../hooks/use-permission";

const { Text, Title } = Typography;
const { TextArea } = Input;

type FilterKey = ActivityType | "comment" | "audit";

// Every bucket a person can filter this feed to - the real activity types
// plus the two non-activity sources getLeadTimeline merges in.
const FILTER_LABEL: Record<FilterKey, string> = {
  ...TYPE_LABEL,
  comment: "Remarks",
  audit: "Status changes",
};
const FILTER_DOT_COLOR: Record<FilterKey, string> = {
  ...TYPE_DOT_COLOR,
  comment: "#be185d",
  audit: "#7c3aed",
};
const ALL_FILTER_KEYS: FilterKey[] = [...ALL_ACTIVITY_TYPES, "comment", "audit"];

// The 4 event kinds people actually filter to day-to-day get their own
// one-click pill, matching the pill-button pattern this app already uses
// elsewhere (e.g. the Leads page's own stage chips) - everything else
// (site visits, WhatsApp, meetings, tickets) is still fully selectable, just
// tucked behind "More filters" instead of cluttering the default row with a
// wall of checkboxes.
const QUICK_FILTERS: { key: string; label: string; types: FilterKey[] }[] = [
  { key: "all", label: "All", types: [] },
  { key: "call", label: "Calls", types: ["call"] },
  { key: "email", label: "Emails", types: ["email"] },
  { key: "comment", label: "Remarks", types: ["comment"] },
  { key: "audit", label: "Status changes", types: ["audit"] },
];

// null when the current selection doesn't correspond to exactly one quick
// pill (e.g. a multi-type combination picked from "More filters") - the
// Segmented control then shows none of its pills as active, which is
// correct: none of them describe what's actually selected.
function matchingQuickFilterKey(selected: Set<FilterKey>): string {
  for (const quick of QUICK_FILTERS) {
    if (quick.types.length === selected.size && quick.types.every((t) => selected.has(t))) return quick.key;
  }
  return "";
}

const AUDIT_ICON: Record<string, React.ReactNode> = {
  escalated: <RiseOutlined />,
  status_changed: <SwapOutlined />,
  owner_reassigned: <UserSwitchOutlined />,
  category_changed: <TagsOutlined />,
  deleted: <DeleteOutlined />,
  internal_notes_updated: <FileTextOutlined />,
  rm_remark_updated: <FileTextOutlined />,
  lg_remark_updated: <FileTextOutlined />,
};
// Reads naturally after an actor's name ("Priya escalated this lead") -
// built from audit_log's own `action` key rather than parsing its `summary`
// text, which carries the lead's name and doesn't make a clean sentence.
const AUDIT_VERB: Record<string, string> = {
  escalated: "escalated this lead",
  status_changed: "changed the stage",
  owner_reassigned: "reassigned the salesperson",
  category_changed: "changed the category",
  deleted: "deleted this lead",
  internal_notes_updated: "updated the internal notes",
  rm_remark_updated: "updated the RM remark",
  lg_remark_updated: "updated the LG remark",
};

function dayGroupLabel(date: string): string {
  const d = dayjs(date);
  if (d.isSame(dayjs(), "day")) return "Today";
  if (d.isSame(dayjs().subtract(1, "day"), "day")) return "Yesterday";
  return d.format("D MMMM YYYY");
}

function Actor({ name, trailing }: { name: string | null; trailing: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
      {name && (
        <Avatar size={20} style={{ background: avatarGradient(name), fontSize: 9, fontWeight: 700, flexShrink: 0 }}>
          {initials(name)}
        </Avatar>
      )}
      <Text strong style={{ fontSize: 13 }}>
        {name ?? "System"}
      </Text>
      <Text type="secondary" style={{ fontSize: 13 }}>
        {trailing}
      </Text>
    </div>
  );
}

function EntryShell({
  node,
  nodeBg,
  children,
  time,
}: {
  node: React.ReactNode;
  nodeBg: string;
  children: React.ReactNode;
  time: string;
}) {
  return (
    <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0, width: 30 }}>
        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: "50%",
            background: nodeBg,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 13,
            color: "#fff",
            flexShrink: 0,
          }}
        >
          {node}
        </div>
      </div>
      <div style={{ flex: 1, minWidth: 0, paddingBottom: 2 }}>
        <div style={{ border: `1px solid ${appTokens.borderLight}`, borderRadius: appTokens.radius, padding: "12px 14px", background: appTokens.surface }}>
          {children}
        </div>
        <Text type="secondary" style={{ fontSize: 11.5, marginLeft: 2 }}>
          {time}
        </Text>
      </div>
    </div>
  );
}

// "left a remark" for the plain internal notes anyone adds from this tab's
// own "+ Add remark" composer - everything else gets a grammatical "logged/
// scheduled a/an <type>" built from the real type label instead of a
// hardcoded list.
function activityVerb(activity: Activity, scheduled: boolean): string {
  if (activity.type === "internal" && activity.subject === "Remark") return "left a remark";
  const label = TYPE_LABEL[activity.type].toLowerCase();
  const article = /^[aeiou]/.test(label) ? "an" : "a";
  return `${scheduled ? "scheduled" : "logged"} ${article} ${label}`;
}

function ActivityEntry({ activity }: { activity: Activity }) {
  const outcome = typeof activity.details.outcome === "string" ? activity.details.outcome : undefined;
  const disposition = typeof activity.details.disposition === "string" ? activity.details.disposition : undefined;
  const dispositionNotes = typeof activity.details.notes === "string" ? activity.details.notes : undefined;
  const recordingUrl = typeof activity.details.recordingUrl === "string" ? activity.details.recordingUrl : undefined;
  const durationSeconds = typeof activity.details.durationSeconds === "number" ? activity.details.durationSeconds : undefined;
  const transcriptUrl = typeof activity.details.transcriptUrl === "string" ? activity.details.transcriptUrl : undefined;
  const emailBody = typeof activity.details.body === "string" ? activity.details.body : undefined;
  const joinUrl = typeof activity.details.joinUrl === "string" ? activity.details.joinUrl : undefined;
  const isInboundEmail = activity.type === "email" && activity.details.direction === "inbound";
  const isScheduled = activity.status !== "completed";
  const isPlainRemark = activity.type === "internal" && activity.subject === "Remark";

  return (
    <EntryShell node={TYPE_ICON[activity.type]} nodeBg={TYPE_DOT_COLOR[activity.type]} time={isScheduled ? `Logged ${formatDateTime(activity.createdAt)}` : formatDateTime(activity.updatedAt)}>
      <Actor name={activity.createdByName} trailing={activityVerb(activity, isScheduled)} />
      {!isPlainRemark && (
        <div style={{ marginTop: 6, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <Text strong style={{ fontSize: 13.5 }}>
            {activity.subject ?? TYPE_LABEL[activity.type]}
          </Text>
          {isInboundEmail && (
            <Tag color="blue" style={{ margin: 0, fontSize: 11 }}>
              Received
            </Tag>
          )}
          {isScheduled && (
            <Tag color="gold" style={{ margin: 0, fontSize: 11 }}>
              {activity.dueDate ? `Due ${formatDateTime(activity.dueDate)}` : "Scheduled"}
            </Tag>
          )}
        </div>
      )}

      {outcome && (
        <Text type="secondary" style={{ fontSize: 13, display: "block", marginTop: 4 }}>
          {outcome}
        </Text>
      )}
      {disposition && (
        <Tag color="blue" style={{ margin: "6px 0 0" }}>
          {disposition}
        </Tag>
      )}
      {dispositionNotes && <Text style={{ fontSize: 13, display: "block", marginTop: 6 }}>{dispositionNotes}</Text>}

      {activity.type === "call" && !isScheduled && (
        <div style={{ marginTop: 8 }}>
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
        <div style={{ marginTop: 8, padding: 8, background: appTokens.surfaceMuted, borderRadius: 6, border: `1px solid ${appTokens.borderLight}` }}>
          <Text style={{ fontSize: 13, whiteSpace: "pre-wrap" }}>{emailBody}</Text>
        </div>
      )}

      {activity.type === "teams_meeting" && (
        <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 4 }}>
          {joinUrl && (
            <a href={joinUrl} target="_blank" rel="noreferrer">
              Join link
            </a>
          )}
          {!isScheduled &&
            (transcriptUrl ? (
              <a href={transcriptUrl} target="_blank" rel="noreferrer">
                Transcript — Teams Maestro AI
              </a>
            ) : (
              <Tooltip title="Transcript will appear here once Microsoft 365 is connected">
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Transcript (not connected yet)
                </Text>
              </Tooltip>
            ))}
        </div>
      )}
    </EntryShell>
  );
}

function CommentEntry({ entry }: { entry: NonNullable<LeadTimelineEntry["comment"]> }) {
  return (
    <EntryShell node={<MessageOutlined />} nodeBg={FILTER_DOT_COLOR.comment} time={formatDateTime(entry.createdAt)}>
      <Actor name={entry.userName} trailing="left a remark" />
      <div
        style={{
          marginTop: 8,
          padding: "8px 12px",
          background: "#fdf2f8",
          borderLeft: `3px solid ${FILTER_DOT_COLOR.comment}`,
          borderRadius: 6,
        }}
      >
        <Text style={{ fontSize: 13.5, fontStyle: "italic", whiteSpace: "pre-wrap" }}>&ldquo;{entry.comment}&rdquo;</Text>
      </div>
      {entry.activitySubject && (
        <Text type="secondary" style={{ fontSize: 11.5, display: "block", marginTop: 6 }}>
          On {TYPE_LABEL[entry.activityType as ActivityType] ?? entry.activityType}: {entry.activitySubject}
        </Text>
      )}
    </EntryShell>
  );
}

// Internal Notes/RM Remark/LG Remark carry free-form paragraphs, not short
// enum-like values (a stage name, an owner's name) - cramming those into the
// same small Tag-chip treatment every other audit event uses would wrap
// badly and read poorly, so these three get their own quote-style block
// instead, same visual language as a remark's own card.
const NOTE_UPDATE_ACTIONS = new Set(["internal_notes_updated", "rm_remark_updated", "lg_remark_updated"]);

function AuditEntry({ event }: { event: AuditEvent }) {
  if (NOTE_UPDATE_ACTIONS.has(event.action)) {
    return (
      <EntryShell node={AUDIT_ICON[event.action] ?? <FileTextOutlined />} nodeBg={FILTER_DOT_COLOR.audit} time={formatDateTime(event.createdAt)}>
        <Actor name={event.actorName} trailing={AUDIT_VERB[event.action] ?? event.summary} />
        {event.newValue && (
          <div
            style={{
              marginTop: 8,
              padding: "8px 12px",
              background: appTokens.surfaceMuted,
              borderRadius: 6,
              border: `1px solid ${appTokens.borderLight}`,
            }}
          >
            <Text style={{ fontSize: 13.5, whiteSpace: "pre-wrap" }}>{event.newValue}</Text>
          </div>
        )}
        {event.oldValue && (
          <Text type="secondary" style={{ fontSize: 11.5, display: "block", marginTop: 6 }}>
            Previously: {event.oldValue}
          </Text>
        )}
      </EntryShell>
    );
  }

  return (
    <EntryShell node={AUDIT_ICON[event.action] ?? <SwapOutlined />} nodeBg={FILTER_DOT_COLOR.audit} time={formatDateTime(event.createdAt)}>
      <Actor name={event.actorName} trailing={AUDIT_VERB[event.action] ?? event.summary} />
      {(event.oldValue || event.newValue) && (
        <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <Tag style={{ margin: 0 }}>{event.oldValue ?? "—"}</Tag>
          <Text type="secondary">→</Text>
          <Tag color="purple" style={{ margin: 0 }}>
            {event.newValue ?? "—"}
          </Tag>
        </div>
      )}
    </EntryShell>
  );
}

function CurrentNoteCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div
      style={{
        flex: "1 1 220px",
        minWidth: 220,
        border: `1px solid ${appTokens.borderLight}`,
        borderRadius: appTokens.radius,
        padding: "10px 12px",
        background: appTokens.surface,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: color, flexShrink: 0 }} />
        <Text strong style={{ fontSize: 11.5, textTransform: "uppercase", letterSpacing: 0.3, color: appTokens.textTertiary }}>
          {label}
        </Text>
      </div>
      <Text style={{ fontSize: 13, whiteSpace: "pre-wrap" }}>{value}</Text>
    </div>
  );
}

interface HistoryTabProps {
  leadId: string;
  // Current values only (no timestamp/actor of their own, unlike everything
  // else in History) - shown as a pinned summary up top since they're plain
  // mutable fields (see LeadFormDrawer's "Visible only to your team"
  // section), not a dated event. Any edit from here on does get a real,
  // dated History entry below (see lead-service.ts's updateLead).
  internalNotes: string | null;
  rmRemark: string | null;
  lgRemark: string | null;
  // Opens the same EmailComposeDrawer the lead header's own Outlook icon
  // already uses (LeadDetail.tsx owns its open state) - "Send an email" here
  // is a second entry point to that one real flow, not a separate composer.
  onComposeEmail: () => void;
}

// The lead's full end-to-end story in one place: every call/email/meeting/
// site visit/WhatsApp message, every remark anyone left, and every real
// stage/owner/category change - merged, newest first, grouped by day.
// Replaces the old Quotes tab slot plus the separate Logs tab and History
// drawer, which each told only part of this story on their own. Deliberately
// has no entry in LeadDetail's TAB_PERMISSION map - every call center/field/
// admin person who can open this lead at all can see its whole history.
export function HistoryTab({ leadId, internalNotes, rmRemark, lgRemark, onComposeEmail }: HistoryTabProps) {
  const hasPermission = useHasPermission();
  const currentNotes = [
    { key: "internalNotes", label: "Internal Notes", value: internalNotes, color: "#7c3aed" },
    { key: "rmRemark", label: "RM Remark", value: rmRemark, color: "#2a78d6" },
    { key: "lgRemark", label: "LG Remark", value: lgRemark, color: "#0f9aa8" },
  ].filter((n): n is { key: string; label: string; value: string; color: string } => Boolean(n.value?.trim()));
  const [entries, setEntries] = useState<LeadTimelineEntry[] | null>(null);
  const [selectedTypes, setSelectedTypes] = useState<Set<FilterKey>>(new Set());
  const [typeSearch, setTypeSearch] = useState("");
  const [remarkOpen, setRemarkOpen] = useState(false);
  const [remarkText, setRemarkText] = useState("");
  const [submittingRemark, setSubmittingRemark] = useState(false);

  const load = () => {
    leadApi
      .getLeadTimeline(leadId)
      .then(setEntries)
      .catch(() => message.error("Failed to load history"));
  };

  useEffect(() => {
    setEntries(null);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leadId]);

  const keyOf = (entry: LeadTimelineEntry): FilterKey =>
    entry.kind === "activity" ? (entry.activity!.type as ActivityType) : entry.kind === "comment" ? "comment" : "audit";

  const counts = useMemo(() => {
    const result: Partial<Record<FilterKey, number>> = {};
    for (const entry of entries ?? []) {
      const key = keyOf(entry);
      result[key] = (result[key] ?? 0) + 1;
    }
    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries]);

  const filtered = useMemo(() => {
    if (!entries) return [];
    return selectedTypes.size === 0 ? entries : entries.filter((e) => selectedTypes.has(keyOf(e)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries, selectedTypes]);

  const grouped = useMemo(() => {
    const groups: { label: string; entries: LeadTimelineEntry[] }[] = [];
    for (const entry of filtered) {
      const label = dayGroupLabel(entry.date);
      const last = groups[groups.length - 1];
      if (last && last.label === label) last.entries.push(entry);
      else groups.push({ label, entries: [entry] });
    }
    return groups;
  }, [filtered]);

  const toggleType = (type: FilterKey) => {
    setSelectedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };
  const visibleKeys = ALL_FILTER_KEYS.filter((key) => FILTER_LABEL[key].toLowerCase().includes(typeSearch.toLowerCase()));

  const submitRemark = async () => {
    if (!remarkText.trim()) return;
    setSubmittingRemark(true);
    try {
      await activityApi.createActivityForLead(leadId, {
        type: "internal",
        subject: "Remark",
        status: "completed",
        details: { notes: remarkText.trim() },
      });
      message.success("Remark added");
      setRemarkText("");
      setRemarkOpen(false);
      load();
    } catch {
      message.error("Failed to add remark");
    } finally {
      setSubmittingRemark(false);
    }
  };

  if (entries === null) return <Skeleton active paragraph={{ rows: 5 }} />;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10, marginBottom: 4 }}>
        <div>
          <Title level={5} style={{ margin: 0 }}>
            History
          </Title>
          <Text type="secondary" style={{ fontSize: 12.5 }}>
            Every call, message, remark, and status change on this lead, in order.
          </Text>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {hasPermission("activities.create") && (
            <Dropdown
              trigger={["click"]}
              placement="bottomRight"
              menu={{
                items: [
                  { key: "remark", icon: <EditOutlined />, label: "Add a remark", onClick: () => setRemarkOpen(true) },
                  { key: "email", icon: <MailOutlined />, label: "Send an email", onClick: onComposeEmail },
                ],
              }}
            >
              <Button icon={<EditOutlined />}>
                Add remark <DownOutlined style={{ fontSize: 10 }} />
              </Button>
            </Dropdown>
          )}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 4 }}>
        <Segmented
          size="small"
          value={matchingQuickFilterKey(selectedTypes)}
          onChange={(key) => {
            const quick = QUICK_FILTERS.find((f) => f.key === key);
            if (quick) setSelectedTypes(new Set(quick.types));
          }}
          options={QUICK_FILTERS.map((f) => ({ label: f.label, value: f.key }))}
        />
        <Dropdown
          trigger={["click"]}
          placement="bottomRight"
          onOpenChange={(open) => {
            if (!open) setTypeSearch("");
          }}
          popupRender={() => (
            <div style={{ background: appTokens.surface, borderRadius: 8, boxShadow: appTokens.shadowLg, padding: 12, minWidth: 240 }}>
              <Input
                size="small"
                placeholder="Search"
                value={typeSearch}
                onChange={(e) => setTypeSearch(e.target.value)}
                style={{ marginBottom: 8 }}
              />
              {visibleKeys.map((key) => (
                <div key={key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0" }}>
                  <Checkbox checked={selectedTypes.has(key)} onChange={() => toggleType(key)}>
                    <span
                      style={{
                        display: "inline-block",
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: FILTER_DOT_COLOR[key],
                        marginRight: 6,
                      }}
                    />
                    {FILTER_LABEL[key]}
                  </Checkbox>
                  <Text type="secondary">{counts[key] ?? 0}</Text>
                </div>
              ))}
              <div style={{ display: "flex", gap: 8, marginTop: 8, borderTop: `1px solid ${appTokens.borderLight}`, paddingTop: 8 }}>
                <Button size="small" onClick={() => setSelectedTypes(new Set(ALL_FILTER_KEYS))}>
                  Select all
                </Button>
                <Button size="small" onClick={() => setSelectedTypes(new Set())}>
                  Clear
                </Button>
              </div>
            </div>
          )}
        >
          <Badge dot={matchingQuickFilterKey(selectedTypes) === ""} color={appTokens.primary} offset={[-6, 2]}>
            <Button size="small" type="text">
              More filters <DownOutlined style={{ fontSize: 10 }} />
            </Button>
          </Badge>
        </Dropdown>
      </div>

      {currentNotes.length > 0 && (
        <div style={{ margin: "12px 0 16px" }}>
          <Text type="secondary" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 0.4, display: "block", marginBottom: 8 }}>
            Current notes
          </Text>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {currentNotes.map((n) => (
              <CurrentNoteCard key={n.key} label={n.label} value={n.value} color={n.color} />
            ))}
          </div>
        </div>
      )}

      <Text type="secondary" style={{ fontSize: 12, display: "block", margin: "8px 0 16px" }}>
        {filtered.length} of {entries.length} events
      </Text>

      {filtered.length === 0 ? (
        <Empty description="No history yet for this lead" style={{ marginTop: 24 }} />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {grouped.map((group) => (
            <div key={group.label}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <Text strong style={{ fontSize: 11.5, textTransform: "uppercase", letterSpacing: 0.4, color: appTokens.textTertiary }}>
                  {group.label}
                </Text>
                <div style={{ flex: 1, height: 1, background: appTokens.borderLight }} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {group.entries.map((entry) =>
                  entry.kind === "activity" ? (
                    <ActivityEntry key={entry.id} activity={entry.activity!} />
                  ) : entry.kind === "comment" ? (
                    <CommentEntry key={entry.id} entry={entry.comment!} />
                  ) : (
                    <AuditEntry key={entry.id} event={entry.event!} />
                  )
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        title="Add a remark"
        open={remarkOpen}
        onCancel={() => setRemarkOpen(false)}
        onOk={submitRemark}
        okText="Add remark"
        confirmLoading={submittingRemark}
      >
        <TextArea
          rows={4}
          placeholder="What should the team know about this lead?"
          value={remarkText}
          onChange={(e) => setRemarkText(e.target.value)}
          autoFocus
        />
      </Modal>
    </div>
  );
}
