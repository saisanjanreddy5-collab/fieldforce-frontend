import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Button, DatePicker, Input, Modal, Select, Typography, message } from "antd";
import {
  ClockCircleOutlined,
  FileTextOutlined,
  HomeOutlined,
  FieldTimeOutlined,
  PlusOutlined,
  SwapOutlined,
} from "@ant-design/icons";
import { type Dayjs } from "dayjs";
import * as leaveApi from "../../api/leave-api";
import type { LeaveBalance, LeaveContextPerson, LeaveRequestKind } from "../../types/leave";
import { errorMessageFrom } from "../../utils/api-error";
import { appTokens } from "../../utils/design-system";

const { Text, Title } = Typography;

const KIND_ROWS: LeaveRequestKind[][] = [
  ["casual", "sick", "earned", "comp_off"],
  ["half_day", "wfh"],
];

const KIND_ICON: Record<LeaveRequestKind, ReactNode> = {
  casual: <ClockCircleOutlined />,
  sick: <PlusOutlined />,
  earned: <FileTextOutlined />,
  comp_off: <SwapOutlined />,
  half_day: <FieldTimeOutlined />,
  wfh: <HomeOutlined />,
};

const KIND_LABEL: Record<LeaveRequestKind, string> = {
  casual: "Casual leave",
  sick: "Sick leave",
  earned: "Earned leave",
  comp_off: "Comp off",
  half_day: "Half day",
  wfh: "Work from home",
};

// Weekends never count as a working day, matching the backend's own
// countWorkingDays - kept in sync manually since this is a client-side
// preview only, the server always recomputes the real value.
function countWorkingDays(start: Dayjs, end: Dayjs): number {
  let count = 0;
  for (let d = start; d.isSame(end, "day") || d.isBefore(end, "day"); d = d.add(1, "day")) {
    const day = d.day();
    if (day !== 0 && day !== 6) count += 1;
  }
  return count;
}

interface ApplyForLeaveModalProps {
  open: boolean;
  onClose: () => void;
  onSubmitted: () => void;
  balances: LeaveBalance[];
  managerName: string | null;
  peers: LeaveContextPerson[];
}

export function ApplyForLeaveModal({ open, onClose, onSubmitted, balances, managerName, peers }: ApplyForLeaveModalProps) {
  const [kind, setKind] = useState<LeaveRequestKind>("casual");
  const [range, setRange] = useState<[Dayjs | null, Dayjs | null]>([null, null]);
  const [reason, setReason] = useState("");
  const [coverUserId, setCoverUserId] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setKind("casual");
    setRange([null, null]);
    setReason("");
    setCoverUserId(undefined);
  }, [open]);

  const [start, end] = range;
  const isHalfDay = kind === "half_day";

  useEffect(() => {
    // A half day request only ever covers one date - picking a "To" date
    // that differs from "From" doesn't mean anything for this kind.
    if (isHalfDay && start && (!end || !end.isSame(start, "day"))) {
      setRange([start, start]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHalfDay, start]);

  const workingDays = useMemo(() => {
    if (isHalfDay) return start ? 0.5 : null;
    if (!start || !end || end.isBefore(start, "day")) return null;
    return countWorkingDays(start, end);
  }, [start, end, isHalfDay]);

  const balance = balances.find((b) => b.key === kind);

  const canSubmit = start && end && !end.isBefore(start, "day") && reason.trim().length > 0 && workingDays !== null && workingDays > 0;

  const handleSubmit = async () => {
    if (!start || !end) return;
    setSubmitting(true);
    try {
      await leaveApi.createLeaveRequest({
        kind,
        startDate: start.format("YYYY-MM-DD"),
        endDate: end.format("YYYY-MM-DD"),
        reason: reason.trim(),
        coverUserId,
      });
      message.success("Leave request submitted");
      onSubmitted();
    } catch (err) {
      message.error(errorMessageFrom(err, "Failed to submit leave request"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      width={520}
      footer={null}
      title={
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: appTokens.radiusSm,
              background: appTokens.primarySoft,
              color: appTokens.primary,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <ClockCircleOutlined />
          </div>
          <div>
            <Title level={5} style={{ margin: 0 }}>
              Apply for leave
            </Title>
            <Text style={{ fontSize: 12, color: appTokens.textTertiary }}>Your calendar is blocked once the manager approves</Text>
          </div>
        </div>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8, marginBottom: 16 }}>
        {KIND_ROWS.map((row, idx) => (
          <div key={idx} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {row.map((k) => {
              const active = kind === k;
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => setKind(k)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "6px 12px",
                    fontSize: 13,
                    fontFamily: appTokens.font,
                    fontWeight: active ? 600 : 500,
                    borderRadius: 999,
                    border: `1px solid ${active ? appTokens.primary : appTokens.border}`,
                    background: appTokens.surface,
                    color: active ? appTokens.primary : appTokens.textPrimary,
                    cursor: "pointer",
                  }}
                >
                  {KIND_ICON[k]}
                  {KIND_LABEL[k]}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          <Text style={{ fontSize: 12.5, fontWeight: 500 }}>
            From <span style={{ color: appTokens.danger }}>*</span>
          </Text>
          <DatePicker style={{ width: "100%", marginTop: 4 }} value={start} onChange={(v) => setRange([v, isHalfDay ? v : end])} />
        </div>
        <div>
          <Text style={{ fontSize: 12.5, fontWeight: 500 }}>
            To <span style={{ color: appTokens.danger }}>*</span>
          </Text>
          <DatePicker style={{ width: "100%", marginTop: 4 }} value={end} disabled={isHalfDay} onChange={(v) => setRange([start, v])} />
        </div>
        <div>
          <Text style={{ fontSize: 12.5, fontWeight: 500 }}>Working days</Text>
          <Input style={{ marginTop: 4 }} value={workingDays ?? ""} disabled placeholder="-" />
        </div>
        <div>
          <Text style={{ fontSize: 12.5, fontWeight: 500 }}>Approver</Text>
          <Input style={{ marginTop: 4 }} value={managerName ? `${managerName} (reporting manager)` : "None - top of org, auto-approved"} disabled />
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        <Text style={{ fontSize: 12.5, fontWeight: 500 }}>
          Reason <span style={{ color: appTokens.danger }}>*</span>
        </Text>
        <Input style={{ marginTop: 4 }} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Family function out of station" />
      </div>

      <div style={{ marginTop: 12 }}>
        <Text style={{ fontSize: 12.5, fontWeight: 500 }}>Cover during absence</Text>
        <Select
          style={{ width: "100%", marginTop: 4 }}
          allowClear
          showSearch
          optionFilterProp="label"
          placeholder="Select a colleague (optional)"
          value={coverUserId}
          onChange={setCoverUserId}
          options={peers.map((p) => ({ value: p.id, label: p.name }))}
        />
      </div>

      <div
        style={{
          marginTop: 16,
          padding: "10px 14px",
          borderRadius: appTokens.radiusSm,
          background: appTokens.primarySoft,
          border: `1px solid ${appTokens.primarySoftBorder}`,
        }}
      >
        {isHalfDay || kind === "wfh" ? (
          <Text style={{ fontSize: 12.5, color: appTokens.primary }}>No leave balance affected - your manager still needs to approve.</Text>
        ) : (
          balance && (
            <>
              <Text strong style={{ fontSize: 12.5, color: appTokens.primary, display: "block" }}>
                Balance for {balance.label}
              </Text>
              <Text style={{ fontSize: 12, color: appTokens.textSecondary }}>
                {balance.key === "comp_off" ? "As earned" : `${balance.annualDays} / year`} · {balance.policyNote} · {balance.approverNote.toLowerCase()}
              </Text>
            </>
          )
        )}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 20 }}>
        <Text style={{ fontSize: 11.5, color: appTokens.textTertiary }}>Team availability updates the moment it is approved</Text>
        <div style={{ display: "flex", gap: 8 }}>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="primary" loading={submitting} disabled={!canSubmit} onClick={handleSubmit}>
            Submit request
          </Button>
        </div>
      </div>
    </Modal>
  );
}
