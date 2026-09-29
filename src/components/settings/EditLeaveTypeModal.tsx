import { useEffect, useState } from "react";
import { Button, Input, InputNumber, Modal, Switch, Typography, message } from "antd";
import * as leaveApi from "../../api/leave-api";
import type { LeaveType } from "../../types/leave";
import { errorMessageFrom } from "../../utils/api-error";
import { appTokens } from "../../utils/design-system";

const { Text, Title } = Typography;

interface EditLeaveTypeModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: (updated: LeaveType) => void;
  leaveType: LeaveType | null;
}

// Only the fields that actually exist for a given leave type are editable -
// e.g. accrual/carry-forward only mean anything for Earned leave, which is
// why leave_types stores them as nullable per row instead of one shape
// every type must fill in.
export function EditLeaveTypeModal({ open, onClose, onSaved, leaveType }: EditLeaveTypeModalProps) {
  const [annualDays, setAnnualDays] = useState<number | null>(null);
  const [accrualPerMonth, setAccrualPerMonth] = useState<number | null>(null);
  const [carryForwardCap, setCarryForwardCap] = useState<number | null>(null);
  const [maxConsecutiveDays, setMaxConsecutiveDays] = useState<number | null>(null);
  const [noticeDays, setNoticeDays] = useState<number | null>(null);
  const [medicalNoteAfterDays, setMedicalNoteAfterDays] = useState<number | null>(null);
  const [expiresAfterDays, setExpiresAfterDays] = useState<number | null>(null);
  const [requiresSecondApprover, setRequiresSecondApprover] = useState(false);
  const [policyNote, setPolicyNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !leaveType) return;
    setAnnualDays(leaveType.annualDays);
    setAccrualPerMonth(leaveType.accrualPerMonth);
    setCarryForwardCap(leaveType.carryForwardCap);
    setMaxConsecutiveDays(leaveType.maxConsecutiveDays);
    setNoticeDays(leaveType.noticeDays);
    setMedicalNoteAfterDays(leaveType.medicalNoteAfterDays);
    setExpiresAfterDays(leaveType.expiresAfterDays);
    setRequiresSecondApprover(leaveType.requiresSecondApprover);
    setPolicyNote(leaveType.policyNote);
  }, [open, leaveType]);

  const handleSave = async () => {
    if (!leaveType) return;
    setSaving(true);
    try {
      const updated = await leaveApi.updateLeaveType(leaveType.key, {
        annualDays,
        accrualPerMonth,
        carryForwardCap,
        maxConsecutiveDays,
        noticeDays,
        medicalNoteAfterDays,
        expiresAfterDays,
        requiresSecondApprover,
        policyNote: policyNote.trim(),
      });
      message.success("Leave type updated");
      onSaved(updated);
    } catch (err) {
      message.error(errorMessageFrom(err, "Failed to update leave type"));
    } finally {
      setSaving(false);
    }
  };

  if (!leaveType) return null;

  const field = (label: string, value: number | null, onChange: (v: number | null) => void, suffix: string) => (
    <div>
      <Text style={{ fontSize: 12, fontWeight: 500 }}>{label}</Text>
      <InputNumber style={{ width: "100%", marginTop: 4 }} min={0} value={value} onChange={onChange} placeholder="Not applicable" addonAfter={suffix} />
    </div>
  );

  return (
    <Modal open={open} onCancel={onClose} width={480} footer={null} title={<Title level={5} style={{ margin: 0 }}>Edit {leaveType.label}</Title>}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 8 }}>
        {field("Annual entitlement", annualDays, setAnnualDays, "days")}
        {field("Accrual per month", accrualPerMonth, setAccrualPerMonth, "days")}
        {field("Carry-forward cap", carryForwardCap, setCarryForwardCap, "days")}
        {field("Max consecutive", maxConsecutiveDays, setMaxConsecutiveDays, "days")}
        {field("Notice required", noticeDays, setNoticeDays, "days")}
        {field("Medical note after", medicalNoteAfterDays, setMedicalNoteAfterDays, "days")}
        {field("Expires after", expiresAfterDays, setExpiresAfterDays, "days")}
      </div>

      <div style={{ marginTop: 12, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <Text style={{ fontSize: 13, fontWeight: 500, display: "block" }}>Needs a second approver</Text>
          <Text style={{ fontSize: 11.5, color: appTokens.textTertiary }}>Manager's decision then goes to their own manager</Text>
        </div>
        <Switch checked={requiresSecondApprover} onChange={setRequiresSecondApprover} />
      </div>

      <div style={{ marginTop: 12 }}>
        <Text style={{ fontSize: 12, fontWeight: 500 }}>Policy note</Text>
        <Input style={{ marginTop: 4 }} value={policyNote} onChange={(e) => setPolicyNote(e.target.value)} maxLength={200} />
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 20 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button type="primary" loading={saving} onClick={handleSave}>
          Save changes
        </Button>
      </div>
    </Modal>
  );
}
