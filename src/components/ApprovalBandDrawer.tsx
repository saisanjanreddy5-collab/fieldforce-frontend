import { useEffect } from "react";
import { Button, Drawer, Form, Input, InputNumber, Select, Space, message } from "antd";
import { isAxiosError } from "axios";
import * as approvalBandApi from "../api/approval-band-api";
import type { ApprovalBand, ApprovalRequestType } from "../types/approval-band";
import type { Level } from "../types/level";
import { REQUEST_TYPE_OPTIONS } from "./ApprovalBandsCard";

interface FormValues {
  requestType: ApprovalRequestType;
  bandName: string;
  rangeFrom?: number;
  rangeTo?: number;
  approverLevelId?: string;
  countersignedByLevelId?: string;
  slaHours?: number;
}

interface ApprovalBandDrawerProps {
  open: boolean;
  band: ApprovalBand | null;
  defaultRequestType: ApprovalRequestType;
  nextSortOrder: number;
  levels: Level[];
  onClose: () => void;
  onSaved: () => void;
}

export function ApprovalBandDrawer({ open, band, defaultRequestType, nextSortOrder, levels, onClose, onSaved }: ApprovalBandDrawerProps) {
  const [form] = Form.useForm<FormValues>();
  const levelOptions = levels.map((l) => ({ value: l.id, label: l.name }));

  useEffect(() => {
    if (!open) return;
    if (band) {
      form.setFieldsValue({
        requestType: band.requestType,
        bandName: band.bandName,
        rangeFrom: band.rangeFrom,
        rangeTo: band.rangeTo ?? undefined,
        approverLevelId: band.approverLevelId ?? undefined,
        countersignedByLevelId: band.countersignedByLevelId ?? undefined,
        slaHours: band.slaHours ?? undefined,
      });
    } else {
      form.resetFields();
      form.setFieldsValue({ requestType: defaultRequestType, rangeFrom: 0 });
    }
  }, [open, band, defaultRequestType, form]);

  const handleSubmit = async (values: FormValues) => {
    try {
      if (band) {
        await approvalBandApi.updateApprovalBand(band.id, {
          bandName: values.bandName,
          rangeFrom: values.rangeFrom,
          rangeTo: values.rangeTo ?? null,
          approverLevelId: values.approverLevelId ?? null,
          countersignedByLevelId: values.countersignedByLevelId ?? null,
          slaHours: values.slaHours ?? null,
        });
        message.success("Approval band updated");
      } else {
        await approvalBandApi.createApprovalBand({
          requestType: values.requestType,
          bandName: values.bandName,
          rangeFrom: values.rangeFrom,
          rangeTo: values.rangeTo,
          approverLevelId: values.approverLevelId,
          countersignedByLevelId: values.countersignedByLevelId,
          slaHours: values.slaHours,
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
    }
  };

  return (
    <Drawer
      title={band ? `Edit ${band.bandName}` : "Add approval band"}
      open={open}
      onClose={onClose}
      size="default"
      extra={
        <Space>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="primary" onClick={() => form.submit()}>
            {band ? "Save changes" : "Add band"}
          </Button>
        </Space>
      }
    >
      <Form<FormValues> form={form} layout="vertical" onFinish={handleSubmit}>
        <Form.Item name="requestType" label="Request type" rules={[{ required: true, message: "Request type is required" }]}>
          <Select options={REQUEST_TYPE_OPTIONS} disabled={!!band} />
        </Form.Item>
        <Form.Item name="bandName" label="Band name" rules={[{ required: true, message: "Band name is required" }]}>
          <Input placeholder="e.g. Band 1 - Team lead" />
        </Form.Item>
        <Space.Compact style={{ width: "100%" }}>
          <Form.Item name="rangeFrom" label="From" style={{ width: "50%" }}>
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="rangeTo" label="To" tooltip="Leave blank for no upper limit" style={{ width: "50%" }}>
            <InputNumber min={0} style={{ width: "100%" }} placeholder="No limit" />
          </Form.Item>
        </Space.Compact>
        <Form.Item name="approverLevelId" label="Approver" tooltip="A role/level, not a specific person - whoever holds it approves">
          <Select allowClear placeholder="Select an approver level" showSearch optionFilterProp="label" options={levelOptions} />
        </Form.Item>
        <Form.Item name="countersignedByLevelId" label="Countersigned by" tooltip="Optional - a second level that must also sign off">
          <Select allowClear placeholder="No countersigner" showSearch optionFilterProp="label" options={levelOptions} />
        </Form.Item>
        <Form.Item name="slaHours" label="SLA (hours)" tooltip="Configuration only for now - not yet enforced by any approval workflow">
          <InputNumber min={0} style={{ width: "100%" }} placeholder="No SLA set" />
        </Form.Item>
      </Form>
    </Drawer>
  );
}
