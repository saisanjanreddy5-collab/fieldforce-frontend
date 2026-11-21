import { useEffect, useState } from "react";
import { Avatar, Button, Empty, Popconfirm, Table, Tag, Typography, message } from "antd";
import { InfoCircleOutlined, PlusOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import * as leaveApi from "../api/leave-api";
import type { LeaveBalance, LeaveContext, LeaveRequest } from "../types/leave";
import { useAuth } from "../context/AuthContext";
import { useHasPermission } from "../hooks/use-permission";
import { appTokens, avatarGradient } from "../utils/design-system";
import { initials } from "../utils/lead-format";
import { daysLabel, formatDateRange, kindColor, kindLabel } from "../utils/leave-format";
import { errorMessageFrom } from "../utils/api-error";
import { ApplyForLeaveModal } from "../components/leave/ApplyForLeaveModal";
import { GrantCompOffModal } from "../components/leave/GrantCompOffModal";
import { LeaveTypesDrawer } from "../components/leave/LeaveTypesDrawer";
import { TeamLeaveTimeline } from "../components/leave/TeamLeaveTimeline";
import { LeaveHistoryBrowser } from "../components/leave/LeaveHistoryBrowser";
import { LeaveStatusTag } from "../components/leave/LeaveStatusTag";
import { ListPagination } from "../components/ListPagination";
import { usePagination } from "../hooks/use-pagination";
import { RequestDetailsModal, type ApprovalStep } from "../components/approvals/RequestDetailsModal";

const { Title, Text } = Typography;

type TabKey = "mine" | "approvals" | "team" | "history";

export default function LeavePage() {
  const { user } = useAuth();
  const hasPermission = useHasPermission();
  const canSeeTeam = hasPermission("leave_requests.approve");
  const canGrantCompOff = hasPermission("comp_off_credits.grant");
  // Admins see every request (view only); deciding stays with each person's
  // reporting manager.
  const canViewAll = hasPermission("leave_requests.view_all");

  const [activeTab, setActiveTab] = useState<TabKey>("mine");
  // Which approval row is mid-request - spinner on that button, blocks double-taps.
  const [deciding, setDeciding] = useState<{ id: string; decision: "approved" | "rejected" } | null>(null);
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [myRequests, setMyRequests] = useState<LeaveRequest[]>([]);
  const minePager = usePagination("leave-mine", 20, myRequests.length);
  const [teamRequests, setTeamRequests] = useState<LeaveRequest[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<LeaveRequest[]>([]);
  const [oversight, setOversight] = useState<LeaveRequest[]>([]);
  const oversightPager = usePagination("leave-oversight", 10, oversight.length);
  const [viewing, setViewing] = useState<LeaveRequest | null>(null);
  const [context, setContext] = useState<LeaveContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [applyOpen, setApplyOpen] = useState(false);
  const [grantCompOffOpen, setGrantCompOffOpen] = useState(false);
  const [typesDrawerOpen, setTypesDrawerOpen] = useState(false);

  // The 30-day Team view's own timeline already includes decided requests in
  // that window, but only as an unlabeled colored bar - no reason, no dates
  // as text, nothing to read. This is the same data, just also rendered the
  // same readable way every other view in this app already shows a request
  // (Mine tab, History tab, the whole Expenses module), instead of only
  // existing as a hard-to-notice bar you have to already know to decode.
  const recentlyDecided = teamRequests
    .filter((r) => r.status !== "pending")
    .sort((a, b) => (b.approverDecidedAt ?? "").localeCompare(a.approverDecidedAt ?? ""));

  const load = () => {
    setLoading(true);
    Promise.all([
      leaveApi.getMyBalances(),
      leaveApi.listMyRequests(),
      leaveApi.getLeaveContext(),
      canSeeTeam ? leaveApi.listTeamRequests() : Promise.resolve([]),
      canSeeTeam ? leaveApi.listPendingApprovals() : Promise.resolve([]),
      canViewAll ? leaveApi.listPendingOversight() : Promise.resolve([]),
    ])
      .then(([balancesResult, mineResult, contextResult, teamResult, pendingResult, oversightResult]) => {
        setBalances(balancesResult);
        setMyRequests(mineResult);
        setContext(contextResult);
        setTeamRequests(teamResult);
        setPendingApprovals(pendingResult);
        setOversight(oversightResult);
      })
      .catch(() => message.error("Failed to load leave data"))
      .finally(() => setLoading(false));
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, []);

  const handleCancel = async (id: string) => {
    try {
      await leaveApi.cancelLeaveRequest(id);
      message.success("Leave request cancelled");
      load();
    } catch (err) {
      message.error(errorMessageFrom(err, "Failed to cancel leave request"));
    }
  };

  const handleDecision = async (id: string, decision: "approved" | "rejected") => {
    setDeciding({ id, decision });
    try {
      await leaveApi.decideLeaveRequest(id, decision);
      message.success(`Request ${decision}`);
      load();
    } catch (err) {
      message.error(errorMessageFrom(err, "Failed to record decision"));
    } finally {
      setDeciding(null);
    }
  };

  return (
    // Same layout as Expenses: the page fills the screen and "My requests"
    // takes the remaining height, its rows scrolling inside it with the pager
    // always visible at its foot. Its minHeight means the sections above can
    // never squeeze it to nothing - if they are taller than the screen, the
    // page itself scrolls instead.
    <div className="page-fill-height" style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 8, flexShrink: 0 }}>
        <div>
          <Title level={3} style={{ margin: 0, letterSpacing: -0.3, color: appTokens.textPrimary }}>
            Leave
          </Title>
          <Text style={{ color: appTokens.textSecondary, fontSize: 13.5 }}>Balances, requests and approval by the reporting manager</Text>
        </div>
        {/* Same full-size buttons as Expenses' header, not size="small" -
            mixed sizes in one row read as misaligned. */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {canGrantCompOff && <Button onClick={() => setGrantCompOffOpen(true)}>Grant comp-off</Button>}
          <Button icon={<InfoCircleOutlined />} onClick={() => setTypesDrawerOpen(true)}>
            Leave types &amp; policy
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setApplyOpen(true)}>
            Apply for leave
          </Button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 16, flexShrink: 0, flexWrap: "wrap" }}>
        <TabButton active={activeTab === "mine"} onClick={() => setActiveTab("mine")}>
          My leave {myRequests.length}
        </TabButton>
        {/* Approvals get their own tab, so My leave always has the full
            screen for its own list (with the pager in view) - the count keeps
            anything waiting impossible to miss. */}
        {(canSeeTeam || canViewAll) && (
          <TabButton active={activeTab === "approvals"} onClick={() => setActiveTab("approvals")}>
            Approvals{" "}
            <span style={{ color: pendingApprovals.length > 0 ? appTokens.warning : undefined, fontWeight: 700 }}>{pendingApprovals.length}</span>
          </TabButton>
        )}
        {canSeeTeam && (
          <TabButton active={activeTab === "team"} onClick={() => setActiveTab("team")}>
            Team leave — next 30 days {teamRequests.length}
          </TabButton>
        )}
        {(canSeeTeam || canViewAll) && (
          <TabButton active={activeTab === "history"} onClick={() => setActiveTab("history")}>
            History
          </TabButton>
        )}
      </div>

      {activeTab === "mine" && (
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 12, flexShrink: 0 }}>
        {balances.map((b) => (
            <div
              key={b.key}
              style={{
                flex: "1 1 180px",
                minWidth: 180,
                border: `1px solid ${appTokens.border}`,
                borderRadius: appTokens.radius,
                padding: "10px 16px",
                background: appTokens.surface,
                boxShadow: appTokens.shadowSm,
              }}
            >
              <Text style={{ fontSize: 11.5, fontWeight: 600, color: appTokens.textTertiary, display: "block" }}>
                {b.key === "comp_off" ? "Comp off leave" : b.label}
              </Text>
              <div style={{ fontSize: 21, fontWeight: 700, color: b.color, letterSpacing: -0.3, lineHeight: 1.25 }}>
                {b.available}
                <Text style={{ fontSize: 13, fontWeight: 500, color: appTokens.textTertiary }}>
                  {" "}
                  {b.key === "comp_off" ? "earned" : `of ${b.entitlement}`}
                </Text>
              </div>
            </div>
          ))}
      </div>

      )}

      {activeTab === "approvals" && pendingApprovals.length === 0 && !(canViewAll && oversight.length > 0) && (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={canViewAll ? "Nothing waiting on anyone right now" : "Nothing waiting on your decision"} style={{ padding: 32 }} />
      )}

      {activeTab === "approvals" && canSeeTeam && pendingApprovals.length > 0 && (
        <div
          style={{
            border: `1px solid ${appTokens.border}`,
            borderRadius: appTokens.radius,
            background: appTokens.surface,
            boxShadow: appTokens.shadowSm,
            padding: 16,
            marginBottom: 16,
            flexShrink: 0,
          }}
        >
          <Text strong style={{ fontSize: 14, display: "block", marginBottom: 8 }}>
            Waiting on your decision
          </Text>
          <div style={{ maxHeight: 280, overflowY: "auto" }}>
          <Table<LeaveRequest>
            size="small"
            rowKey="id"
            dataSource={pendingApprovals}
            pagination={false}
            scroll={{ x: 640 }}
            columns={[
              { title: "Person", key: "person", render: (_, r) => r.userName },
              { title: "Type", key: "type", render: (_, r) => kindLabel(r.kind, balances) },
              { title: "Dates", key: "dates", render: (_, r) => formatDateRange(r.startDate, r.endDate) },
              { title: "Days", key: "days", render: (_, r) => daysLabel(r.daysCount) },
              { title: "Reason", dataIndex: "reason" },
              {
                title: "",
                key: "actions",
                render: (_, r) => (
                  <div style={{ display: "flex", gap: 8 }}>
                    <Button
                      size="small"
                      type="primary"
                      loading={deciding?.id === r.id && deciding.decision === "approved"}
                      disabled={deciding?.id === r.id && deciding.decision !== "approved"}
                      onClick={() => handleDecision(r.id, "approved")}
                    >
                      Approve
                    </Button>
                    <Button
                      size="small"
                      danger
                      loading={deciding?.id === r.id && deciding.decision === "rejected"}
                      disabled={deciding?.id === r.id && deciding.decision !== "rejected"}
                      onClick={() => handleDecision(r.id, "rejected")}
                    >
                      Reject
                    </Button>
                  </div>
                ),
              },
            ]}
          />
          </div>
        </div>
      )}

      {activeTab === "approvals" && canViewAll && oversight.length > 0 && (
        <div
          style={{
            border: `1px solid ${appTokens.border}`,
            borderRadius: appTokens.radius,
            background: appTokens.surface,
            boxShadow: appTokens.shadowSm,
            padding: 16,
            marginBottom: 16,
            flexShrink: 0,
          }}
        >
          <Text strong style={{ fontSize: 14, display: "block" }}>
            Pending with other managers
          </Text>
          <Text style={{ fontSize: 12.5, color: appTokens.textTertiary, display: "block", marginBottom: 8 }}>
            View only - each request is approved or rejected by the person's reporting manager
          </Text>
          <Table<LeaveRequest>
            size="small"
            rowKey="id"
            dataSource={oversightPager.slice(oversight)}
            pagination={false}
            scroll={{ x: 760 }}
            onRow={(r) => ({ onClick: () => setViewing(r), className: "table-row-hover", style: { cursor: "pointer" } })}
            columns={[
              { title: "Person", key: "person", render: (_, r) => r.userName },
              { title: "Type", key: "type", render: (_, r) => kindLabel(r.kind, balances) },
              { title: "Dates", key: "dates", render: (_, r) => formatDateRange(r.startDate, r.endDate) },
              { title: "Days", key: "days", render: (_, r) => daysLabel(r.daysCount) },
              { title: "Reason", dataIndex: "reason", ellipsis: true },
              { title: "Waiting on", key: "waiting", render: (_, r) => leaveWaitingOn(r) },
              {
                title: "",
                key: "view",
                width: 70,
                render: (_, r) => (
                  <Button size="small" type="link" onClick={() => setViewing(r)}>
                    View
                  </Button>
                ),
              },
            ]}
          />
          <div style={{ paddingTop: 12 }}>
            <ListPagination {...oversightPager.props(oversight.length)} />
          </div>
        </div>
      )}

      {activeTab === "mine" ? (
        <div
          style={{
            border: `1px solid ${appTokens.border}`,
            borderRadius: appTokens.radius,
            background: appTokens.surface,
            boxShadow: appTokens.shadowSm,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            // Fills what's left of the screen; never shorter than ~6 rows +
            // pager. With nothing to list it just hugs its empty state.
            flex: !loading && myRequests.length === 0 ? "0 0 auto" : "1 0 auto",
            height: !loading && myRequests.length === 0 ? undefined : 0,
            minHeight: !loading && myRequests.length === 0 ? undefined : 300,
          }}
        >
          <div style={{ padding: "16px 16px 0", flexShrink: 0 }}>
            <Text strong style={{ fontSize: 14 }}>
              My requests
            </Text>
            <div>
              <Text style={{ fontSize: 12.5, color: appTokens.textTertiary }}>Approved leave blocks your calendar and reassigns your activities</Text>
            </div>
          </div>

          <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "12px 16px 16px" }}>
          <Table<LeaveRequest>
            className="thin-scroll-table"
            size="small"
            rowKey="id"
            loading={loading}
            dataSource={minePager.slice(myRequests)}
            pagination={false}
            scroll={{ x: 720 }}
            locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No leave requests yet" /> }}
            columns={[
              {
                title: "Person",
                key: "person",
                render: (_, r) => (
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Avatar size={26} style={{ background: avatarGradient(r.userName ?? "?"), fontSize: 11, fontWeight: 600 }}>
                      {initials(r.userName ?? "?")}
                    </Avatar>
                    <div>
                      <Text strong style={{ fontSize: 13, display: "block" }}>
                        {r.userName ?? user?.name}
                      </Text>
                      <Text style={{ fontSize: 11, color: appTokens.textTertiary }}>applied {dayjs(r.createdAt).format("D MMM")}</Text>
                    </div>
                  </div>
                ),
              },
              {
                title: "Type",
                key: "type",
                render: (_, r) => (
                  <Tag style={{ color: kindColor(r.kind, balances), background: `${kindColor(r.kind, balances)}17`, border: "none" }}>
                    {kindLabel(r.kind, balances)}
                  </Tag>
                ),
              },
              { title: "Dates", key: "dates", render: (_, r) => formatDateRange(r.startDate, r.endDate) },
              { title: "Days", key: "days", render: (_, r) => daysLabel(r.daysCount) },
              { title: "Cover", key: "cover", render: (_, r) => r.coverUserName ?? "-" },
              {
                title: "Status",
                key: "status",
                render: (_, r) => <LeaveStatusTag status={r.status} />,
              },
              {
                title: "",
                key: "actions",
                render: (_, r) =>
                  r.status === "pending" ? (
                    <Popconfirm title="Cancel this leave request?" onConfirm={() => handleCancel(r.id)}>
                      <Button type="link" size="small" danger>
                        Cancel
                      </Button>
                    </Popconfirm>
                  ) : null,
              },
            ]}
          />
          </div>

          {myRequests.length > 0 && (
            <div style={{ padding: "12px 16px", flexShrink: 0, borderTop: `1px solid ${appTokens.borderLight}` }}>
              <ListPagination {...minePager.props(myRequests.length)} />
            </div>
          )}
        </div>
      ) : activeTab === "history" ? (
        <div>
          <LeaveHistoryBrowser balances={balances} directReports={context?.directReports ?? []} />
        </div>
      ) : activeTab === "team" ? (
        <div>
          {recentlyDecided.length > 0 && (
            <div
              style={{
                border: `1px solid ${appTokens.border}`,
                borderRadius: appTokens.radius,
                background: appTokens.surface,
                boxShadow: appTokens.shadowSm,
                padding: 16,
                marginBottom: 16,
              }}
            >
              <Text strong style={{ fontSize: 14, display: "block" }}>
                Recently decided
              </Text>
              <div style={{ marginBottom: 8 }}>
                <Text style={{ fontSize: 12.5, color: appTokens.textTertiary }}>
                  Approved/rejected requests in this 30-day window - see History for any month, any status
                </Text>
              </div>
              <Table<LeaveRequest>
                size="small"
                rowKey="id"
                dataSource={recentlyDecided}
                pagination={false}
                scroll={{ x: 640 }}
                columns={[
                  { title: "Person", key: "person", render: (_, r) => r.userName },
                  { title: "Type", key: "type", render: (_, r) => kindLabel(r.kind, balances) },
                  { title: "Dates", key: "dates", render: (_, r) => formatDateRange(r.startDate, r.endDate) },
                  { title: "Days", key: "days", render: (_, r) => daysLabel(r.daysCount) },
                  { title: "Reason", dataIndex: "reason" },
                  {
                    title: "Status",
                    key: "status",
                    render: (_, r) => <LeaveStatusTag status={r.status} />,
                  },
                ]}
              />
            </div>
          )}
          <TeamLeaveTimeline requests={teamRequests} />
        </div>
      ) : null}

      {viewing && (
        <RequestDetailsModal
          open
          onClose={() => setViewing(null)}
          title={`${viewing.userName ?? "Leave request"} - ${kindLabel(viewing.kind, balances)}`}
          status={<LeaveStatusTag status={viewing.status} />}
          fields={[
            { label: "Person", value: viewing.userName ?? "-" },
            { label: "Type", value: kindLabel(viewing.kind, balances) },
            { label: "Dates", value: formatDateRange(viewing.startDate, viewing.endDate) },
            { label: "Days", value: daysLabel(viewing.daysCount) },
            { label: "Reason", value: viewing.reason || "-" },
            { label: "Cover", value: viewing.coverUserName ?? "-" },
            { label: "Applied", value: dayjs(viewing.createdAt).format("D MMM YYYY, h:mm A") },
          ]}
          steps={leaveSteps(viewing)}
        />
      )}

      <ApplyForLeaveModal
        open={applyOpen}
        onClose={() => setApplyOpen(false)}
        onSubmitted={() => {
          setApplyOpen(false);
          load();
        }}
        balances={balances}
        managerName={user?.managerName ?? null}
        peers={context?.peers ?? []}
      />
      <GrantCompOffModal
        open={grantCompOffOpen}
        onClose={() => setGrantCompOffOpen(false)}
        onGranted={() => {
          setGrantCompOffOpen(false);
          load();
        }}
        directReports={context?.directReports ?? []}
      />
      <LeaveTypesDrawer open={typesDrawerOpen} onClose={() => setTypesDrawerOpen(false)} balances={balances} />
    </div>
  );
}

// Who a pending request is waiting on right now: the reporting manager, or -
// for leave that needs a second sign-off - the next manager up.
function leaveWaitingOn(r: LeaveRequest): string {
  if (r.approverDecision === "approved" && r.secondApproverId) return r.secondApproverName ?? "Second approver";
  return r.approverName ?? "No manager set";
}

function leaveSteps(r: LeaveRequest): ApprovalStep[] {
  const steps: ApprovalStep[] = [
    { label: "Reporting manager", person: r.approverName, decision: r.approverDecision, decidedAt: r.approverDecidedAt },
  ];
  if (r.secondApproverId) {
    steps.push({ label: "Second approval", person: r.secondApproverName, decision: r.secondApproverDecision, decidedAt: r.secondApproverDecidedAt });
  }
  return steps;
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <Button
      size="small"
      shape="round"
      onClick={onClick}
      style={{
        background: appTokens.surface,
        borderWidth: active ? 1.5 : 1,
        borderColor: active ? appTokens.primary : appTokens.border,
        color: active ? appTokens.primary : appTokens.textSecondary,
        fontWeight: active ? 600 : 500,
      }}
    >
      {children}
    </Button>
  );
}
