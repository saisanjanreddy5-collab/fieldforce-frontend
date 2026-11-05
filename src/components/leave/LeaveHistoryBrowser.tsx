import { useEffect, useState } from "react";
import { Avatar, DatePicker, Select, Table, Tag, Typography, message } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import * as leaveApi from "../../api/leave-api";
import type { LeaveBalance, LeaveContextPerson, LeaveRequest } from "../../types/leave";
import { appTokens, avatarGradient } from "../../utils/design-system";
import { initials } from "../../utils/lead-format";
import { daysLabel, formatDateRange, kindColor, kindLabel } from "../../utils/leave-format";

const { Text } = Typography;

const STATUS_COLOR: Record<string, string> = {
  pending: appTokens.warning,
  approved: appTokens.success,
  rejected: appTokens.danger,
  cancelled: appTokens.textTertiary,
};

interface LeaveHistoryBrowserProps {
  balances: LeaveBalance[];
  directReports: LeaveContextPerson[];
}

// The real fix for WEB-010/WEB-011: the only admin/manager-facing leave view
// on web (TeamLeaveTimeline) is hardcoded to a rolling "today -> +30 days"
// window, so anything approved outside it - including a request whose dates
// already passed - simply never shows up there. This wires the web app to
// searchLeaveRequests, a real "any month, any status, any person in your
// reporting chain" query that already existed for the mobile app and was
// never called from here.
export function LeaveHistoryBrowser({ balances, directReports }: LeaveHistoryBrowserProps) {
  const [month, setMonth] = useState<Dayjs>(dayjs());
  const [personId, setPersonId] = useState<string | undefined>(undefined);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    leaveApi
      .searchLeaveRequests({
        userId: personId,
        from: month.startOf("month").format("YYYY-MM-DD"),
        to: month.endOf("month").format("YYYY-MM-DD"),
        limit: 200,
      })
      .then((r) => setRequests(r.requests))
      .catch(() => message.error("Failed to load leave history"))
      .finally(() => setLoading(false));
  }, [month, personId]);

  return (
    <div
      style={{
        border: `1px solid ${appTokens.border}`,
        borderRadius: appTokens.radius,
        background: appTokens.surface,
        boxShadow: appTokens.shadowSm,
        padding: 16,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
        <div>
          <Text strong style={{ fontSize: 14 }}>
            Leave history
          </Text>
          <div>
            <Text style={{ fontSize: 12.5, color: appTokens.textTertiary }}>Any month, any status - not just the next 30 days</Text>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Select
            allowClear
            placeholder="Everyone"
            style={{ width: 180 }}
            value={personId}
            onChange={setPersonId}
            options={directReports.map((p) => ({ value: p.id, label: p.name }))}
          />
          <DatePicker picker="month" value={month} onChange={(v) => v && setMonth(v)} allowClear={false} />
        </div>
      </div>

      <Table<LeaveRequest>
        className="thin-scroll-table"
        size="small"
        rowKey="id"
        loading={loading}
        dataSource={requests}
        pagination={false}
        locale={{ emptyText: "No leave requests in this month" }}
        columns={[
          {
            title: "Person",
            key: "person",
            render: (_, r) => (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Avatar size={26} style={{ background: avatarGradient(r.userName ?? "?"), fontSize: 11, fontWeight: 600 }}>
                  {initials(r.userName ?? "?")}
                </Avatar>
                <Text strong style={{ fontSize: 13 }}>
                  {r.userName ?? "-"}
                </Text>
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
          { title: "Reason", dataIndex: "reason" },
          {
            title: "Status",
            key: "status",
            render: (_, r) => (
              <Tag style={{ color: STATUS_COLOR[r.status], background: `${STATUS_COLOR[r.status]}17`, border: "none", fontWeight: 600 }}>
                {r.status[0].toUpperCase() + r.status.slice(1)}
              </Tag>
            ),
          },
        ]}
      />
    </div>
  );
}
