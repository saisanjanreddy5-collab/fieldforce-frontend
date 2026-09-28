import { useEffect, useState } from "react";
import { Button, DatePicker, Input, Modal, Select, Typography, message } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import * as leaveApi from "../../api/leave-api";
import type { LeaveContextPerson } from "../../types/leave";
import { errorMessageFrom } from "../../utils/api-error";

const { Text } = Typography;

interface GrantCompOffModalProps {
  open: boolean;
  onClose: () => void;
  onGranted: () => void;
  directReports: LeaveContextPerson[];
}

export function GrantCompOffModal({ open, onClose, onGranted, directReports }: GrantCompOffModalProps) {
  const [userId, setUserId] = useState<string | undefined>();
  const [earnedDate, setEarnedDate] = useState<Dayjs | null>(null);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setUserId(undefined);
    setEarnedDate(null);
    setReason("");
  }, [open]);

  const handleSubmit = async () => {
    if (!userId || !earnedDate) return;
    setSaving(true);
    try {
      await leaveApi.grantCompOff({ userId, earnedDate: earnedDate.format("YYYY-MM-DD"), reason: reason.trim() || undefined });
      message.success("Comp-off credited - expires in 60 days");
      onGranted();
    } catch (err) {
      message.error(errorMessageFrom(err, "Failed to grant comp-off"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title="Grant comp-off"
      open={open}
      onCancel={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="primary" loading={saving} disabled={!userId || !earnedDate} onClick={handleSubmit}>
            Credit 1 day
          </Button>
        </>
      }
    >
      <Text type="secondary" style={{ fontSize: 12.5, display: "block", marginBottom: 12 }}>
        Credits one comp-off day to a direct report for weekend/extra field work - it expires 60 days from the date they worked.
      </Text>
      <div style={{ marginBottom: 10 }}>
        <Text style={{ fontSize: 12.5, fontWeight: 500 }}>Person</Text>
        <Select
          style={{ width: "100%", marginTop: 4 }}
          showSearch
          optionFilterProp="label"
          placeholder="Select a direct report"
          value={userId}
          onChange={setUserId}
          options={directReports.map((p) => ({ value: p.id, label: p.name }))}
        />
      </div>
      <div style={{ marginBottom: 10 }}>
        <Text style={{ fontSize: 12.5, fontWeight: 500 }}>Date worked</Text>
        <DatePicker style={{ width: "100%", marginTop: 4 }} value={earnedDate} onChange={setEarnedDate} disabledDate={(d) => d.isAfter(dayjs(), "day")} />
      </div>
      <div>
        <Text style={{ fontSize: 12.5, fontWeight: 500 }}>Reason (optional)</Text>
        <Input style={{ marginTop: 4 }} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Sunday store launch coverage" />
      </div>
    </Modal>
  );
}
