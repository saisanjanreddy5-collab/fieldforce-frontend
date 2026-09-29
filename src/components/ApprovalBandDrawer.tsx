import { useEffect, useState } from "react";
import { Button, Drawer, Input, InputNumber, Select, Typography, message } from "antd";
import { FileProtectOutlined } from "@ant-design/icons";
import { isAxiosError } from "axios";
import * as approvalBandApi from "../api/approval-band-api";
import type { ApprovalBand, ApprovalRequestType } from "../types/approval-band";
import type { Level } from "../types/level";
import { REQUEST_TYPE_OPTIONS } from "./ApprovalBandsCard";
import { appTokens } from "../utils/design-system";

const { Text, Title } = Typography;

interface ApprovalBandDrawerProps {
  open: boolean;
  band: ApprovalBand | null;
  defaultRequestType: ApprovalRequestType;
  nextSortOrder: number;
  levels: Level[];
  onClose: () => void;
  onSaved: () => void;
}

// Same hand-styled field pattern as every other edit drawer/modal in this
// app (EditAssignmentRuleModal, EmailComposeDrawer, ...) - this one was
// still plain default AntD Form.Item layout, which is exactly what stood
// out as unpolished next to everything else.
export function ApprovalBandDrawer({ open, band, defaultRequestType, nextSortOrder, levels, onClose, onSaved }: ApprovalBandDrawerProps) {
  const isNew = band === null;
  const [requestType, setRequestType] = useState<ApprovalRequestType>(defaultRequestType);
  const [bandName, setBandName] = useState("");
  const [rangeFrom, setRangeFrom] = useState<number | null>(0);
  const [rangeTo, setRangeTo] = useState<number | null>(null);
  const [approverLevelId, setApproverLevelId] = useState<string | undefined>();
  const [countersignedByLevelId, setCountersignedByLevelId] = useState<string | undefined>();
  const [slaHours, setSlaHours] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const levelOptions = levels.map((l) => ({ value: l.id, label: l.name }));

  useEffect(() => {
    if (!open) return;
    if (band) {
      setRequestType(band.requestType);
      setBandName(band.bandName);
      setRangeFrom(band.rangeFrom);
      setRangeTo(band.rangeTo);
      setApproverLevelId(band.approverLevelId ?? undefined);
      setCountersignedByLevelId(band.countersignedByLevelId ?? undefined);
      setSlaHours(band.slaHours);
    } else {
      setRequestType(defaultRequestType);
      setBandName("");
      setRangeFrom(0);
      setRangeTo(null);
      setApproverLevelId(undefined);
      setCountersignedByLevelId(undefined);
      setSlaHours(null);
    }
  }, [open, band, defaultRequestType]);

  const canSave = bandName.trim().length > 0 && rangeFrom !== null;

  const handleSubmit = async () => {
    if (rangeFrom === null) return;
    setSaving(true);
    try {
      if (band) {
        await approvalBandApi.updateApprovalBand(band.id, {
          bandName: bandName.trim(),
          rangeFrom,
          rangeTo,
          approverLevelId: approverLevelId ?? null,
          countersignedByLevelId: countersignedByLevelId ?? null,
          slaHours,
        });
        message.success("Approval band updated");
      } else {
        await approvalBandApi.createApprovalBand({
          requestType,
          bandName: bandName.trim(),
          rangeFrom,
          rangeTo: rangeTo ?? undefined,
          approverLevelId,
          countersignedByLevelId,
          slaHours: slaHours ?? undefined,
          sortOrder: nextSortOrder,
        });
        message.success("Approval band added");
      }
      onSaved();
    } catch (err) {
      const description =
        isAxiosError<{ message?: string }>(err) && err.response?.data.message
          ? err.response.data.message
          : "Failed to save approval band";
      message.error(description);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width={420}
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
            <FileProtectOutlined />
          </div>
          <div>
            <Title level={5} style={{ margin: 0 }}>
              {isNew ? "New approval band" : `Edit ${band.bandName}`}
            </Title>
            <Text style={{ fontSize: 12, color: appTokens.textTertiary }}>An escalation tier within one request type</Text>
          </div>
        </div>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <Text style={{ fontSize: 12.5, fontWeight: 500 }}>
            Request type <span style={{ color: appTokens.danger }}>*</span>
          </Text>
          <Select
            style={{ width: "100%", marginTop: 4 }}
            value={requestType}
            onChange={setRequestType}
            disabled={!isNew}
            options={REQUEST_TYPE_OPTIONS}
          />
        </div>
        <div>
          <Text style={{ fontSize: 12.5, fontWeight: 500 }}>
            Band name <span style={{ color: appTokens.danger }}>*</span>
          </Text>
          <Input style={{ marginTop: 4 }} value={bandName} onChange={(e) => setBandName(e.target.value)} placeholder="e.g. Band 1 - Team lead" />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <Text style={{ fontSize: 12.5, fontWeight: 500 }}>From</Text>
            <InputNumber style={{ width: "100%", marginTop: 4 }} min={0} value={rangeFrom} onChange={setRangeFrom} />
          </div>
          <div>
            <Text style={{ fontSize: 12.5, fontWeight: 500 }}>To</Text>
            <InputNumber style={{ width: "100%", marginTop: 4 }} min={0} value={rangeTo} onChange={setRangeTo} placeholder="No limit" />
          </div>
        </div>
        <div>
          <Text style={{ fontSize: 12.5, fontWeight: 500 }}>Approver</Text>
          <Select
            style={{ width: "100%", marginTop: 4 }}
            allowClear
            showSearch
            optionFilterProp="label"
            placeholder="Select an approver level"
            value={approverLevelId}
            onChange={setApproverLevelId}
            options={levelOptions}
          />
          <Text style={{ fontSize: 11, color: appTokens.textTertiary }}>A role/level, not a specific person - whoever holds it approves</Text>
        </div>
        <div>
          <Text style={{ fontSize: 12.5, fontWeight: 500 }}>Countersigned by</Text>
          <Select
            style={{ width: "100%", marginTop: 4 }}
            allowClear
            showSearch
            optionFilterProp="label"
            placeholder="No countersigner"
            value={countersignedByLevelId}
            onChange={setCountersignedByLevelId}
            options={levelOptions}
          />
          <Text style={{ fontSize: 11, color: appTokens.textTertiary }}>Optional - a second level that must also sign off</Text>
        </div>
        <div>
          <Text style={{ fontSize: 12.5, fontWeight: 500 }}>SLA (hours)</Text>
          <InputNumber style={{ width: "100%", marginTop: 4 }} min={0} value={slaHours} onChange={setSlaHours} placeholder="No SLA set" />
          <Text style={{ fontSize: 11, color: appTokens.textTertiary }}>Configuration only for now - not yet enforced by any approval workflow</Text>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 24 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button type="primary" loading={saving} disabled={!canSave} onClick={handleSubmit}>
          {isNew ? "Add band" : "Save changes"}
        </Button>
      </div>
    </Drawer>
  );
}
