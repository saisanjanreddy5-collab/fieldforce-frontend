import { useEffect, useState } from "react";
import { Avatar, Button, Popconfirm, Table, Tag, Typography, message } from "antd";
import { PlusOutlined } from "@ant-design/icons";
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

const { Title, Text } = Typography;

const STATUS_COLOR: Record<string, string> = {
  pending: appTokens.warning,
  approved: appTokens.success,
  rejected: appTokens.danger,
  cancelled: appTokens.textTertiary,
};

type TabKey = "mine" | "team";

export default function LeavePage() {
  const { user } = useAuth();
  const hasPermission = useHasPermission();
  const canSeeTeam = hasPermission("leave_requests.approve");
  const canGrantCompOff = hasPermission("comp_off_credits.grant");

  const [activeTab, setActiveTab] = useState<TabKey>("mine");
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [myRequests, setMyRequests] = useState<LeaveRequest[]>([]);
  const [teamRequests, setTeamRequests] = useState<LeaveRequest[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<LeaveRequest[]>([]);
  const [context, setContext] = useState<LeaveContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [applyOpen, setApplyOpen] = useState(false);
  const [grantCompOffOpen, setGrantCompOffOpen] = useState(false);
  const [typesDrawerOpen, setTypesDrawerOpen] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([
      leaveApi.getMyBalances(),
      leaveApi.listMyRequests(),
      leaveApi.getLeaveContext(),
      canSeeTeam ? leaveApi.listTeamRequests() : Promise.resolve([]),
      canSeeTeam ? leaveApi.listPendingApprovals() : Promise.resolve([]),
    ])
      .then(([balancesResult, mineResult, contextResult, teamResult, pendingResult]) => {
        setBalances(balancesResult);
        setMyRequests(mineResult);
        setContext(contextResult);
        setTeamRequests(teamResult);
        setPendingApprovals(pendingResult);
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
    try {
      await leaveApi.decideLeaveRequest(id, decision);
      message.success(`Request ${decision}`);
      load();
    } catch (err) {
      message.error(errorMessageFrom(err, "Failed to record decision"));
    }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 8 }}>
        <div>
          <Title level={3} style={{ margin: 0, letterSpacing: -0.3, color: appTokens.textPrimary }}>
            Leave
          </Title>
          <Text style={{ color: appTokens.textSecondary, fontSize: 13.5 }}>Balances, requests and approval by the reporting manager</Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setApplyOpen(true)}>
          Apply for leave
        </Button>
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        <Button
          size="small"
          shape="round"
          onClick={() => setActiveTab("mine")}
          style={{
            background: appTokens.surface,
            borderWidth: activeTab === "mine" ? 1.5 : 1,
            borderColor: activeTab === "mine" ? appTokens.primary : appTokens.border,
            color: activeTab === "mine" ? appTokens.primary : appTokens.textSecondary,
            fontWeight: activeTab === "mine" ? 600 : 500,
          }}
        >
          My leave {myRequests.length}
        </Button>
        {canSeeTeam && (
          <Button
            size="small"
            shape="round"
            onClick={() => setActiveTab("team")}
            style={{
              background: appTokens.surface,
              borderWidth: activeTab === "team" ? 1.5 : 1,
              borderColor: activeTab === "team" ? appTokens.primary : appTokens.border,
              color: activeTab === "team" ? appTokens.primary : appTokens.textSecondary,
              fontWeight: activeTab === "team" ? 600 : 500,
            }}
          >
            Team leave — next 30 days {teamRequests.length}
          </Button>
        )}
      </div>

      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 16 }}>
        {balances.map((b) => (
          <div
            key={b.key}
            style={{
              flex: "1 1 180px",
              minWidth: 180,
              border: `1px solid ${appTokens.border}`,
              borderRadius: appTokens.radius,
              padding: "14px 16px",
              background: appTokens.surface,
              boxShadow: appTokens.shadowSm,
            }}
          >
            <Text style={{ fontSize: 11.5, fontWeight: 600, color: appTokens.textTertiary, display: "block" }}>
              {b.key === "comp_off" ? "Comp off leave" : b.label}
            </Text>
            <div style={{ fontSize: 26, fontWeight: 700, color: b.color, letterSpacing: -0.4, lineHeight: 1.25 }}>
              {b.available}
              <Text style={{ fontSize: 13, fontWeight: 500, color: appTokens.textTertiary }}>
                {" "}
                {b.key === "comp_off" ? "earned" : `of ${b.entitlement}`}
              </Text>
            </div>
          </div>
        ))}
      </div>

      {activeTab === "mine" ? (
        <div
          style={{
            border: `1px solid ${appTokens.border}`,
            borderRadius: appTokens.radius,
            background: appTokens.surface,
            boxShadow: appTokens.shadowSm,
            padding: 16,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
            <div>
              <Text strong style={{ fontSize: 14 }}>
                My requests
              </Text>
              <div>
                <Text style={{ fontSize: 12.5, color: appTokens.textTertiary }}>Approved leave blocks your calendar and reassigns your activities</Text>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {canGrantCompOff && (
                <Button size="small" onClick={() => setGrantCompOffOpen(true)}>
                  Grant comp-off
                </Button>
              )}
              <Button size="small" onClick={() => setTypesDrawerOpen(true)}>
                Leave types &amp; policy
              </Button>
            </div>
          </div>

          <Table<LeaveRequest>
            className="thin-scroll-table"
            size="small"
            rowKey="id"
            loading={loading}
            dataSource={myRequests}
            pagination={false}
            locale={{ emptyText: "No leave requests yet" }}
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
                render: (_, r) => (
                  <Tag style={{ color: STATUS_COLOR[r.status], background: `${STATUS_COLOR[r.status]}17`, border: "none", fontWeight: 600 }}>
                    {r.status[0].toUpperCase() + r.status.slice(1)}
                  </Tag>
                ),
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

          {canSeeTeam && pendingApprovals.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <Text strong style={{ fontSize: 14, display: "block", marginBottom: 8 }}>
                Waiting on your decision
              </Text>
              <Table<LeaveRequest>
                size="small"
                rowKey="id"
                dataSource={pendingApprovals}
                pagination={false}
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
                        <Button size="small" type="primary" onClick={() => handleDecision(r.id, "approved")}>
                          Approve
                        </Button>
                        <Button size="small" danger onClick={() => handleDecision(r.id, "rejected")}>
                          Reject
                        </Button>
                      </div>
                    ),
                  },
                ]}
              />
            </div>
          )}
        </div>
      ) : (
        <TeamLeaveTimeline requests={teamRequests} />
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
