import { useEffect } from "react";
import { Button, Drawer, Form, Input, InputNumber, Select, Space, Switch, message } from "antd";
import { isAxiosError } from "axios";
import * as levelApi from "../api/level-api";
import type { Level, RecordScope } from "../types/level";
import type { Role } from "../types/auth";
import { RECORD_SCOPE_OPTIONS } from "../utils/level-format";

interface FormValues {
  name: string;
  description?: string;
  headcountLimit?: number;
  approvalCeiling?: number;
  securityTier: Role;
  isCrossCutting: boolean;
  recordScope: RecordScope;
  seesLabelOverride?: string;
  approvalLabelOverride?: string;
  canEditLabel?: string;
}

const SECURITY_TIER_OPTIONS: { value: Role; label: string }[] = [
  { value: "admin", label: "Administrator tier - full system access" },
  { value: "manager", label: "Manager tier - sees own + everyone below" },
  { value: "agent", label: "Agent tier - sees own records only" },
];

interface LevelDrawerProps {
  open: boolean;
  level: Level | null;
  nextSortOrder: number;
  onClose: () => void;
  onSaved: () => void;
}

export function LevelDrawer({ open, level, nextSortOrder, onClose, onSaved }: LevelDrawerProps) {
  const [form] = Form.useForm<FormValues>();

  useEffect(() => {
    if (!open) return;
    if (level) {
      form.setFieldsValue({
        name: level.name,
        description: level.description ?? undefined,
        headcountLimit: level.headcountLimit ?? undefined,
        approvalCeiling: level.approvalCeiling ?? undefined,
        securityTier: level.securityTier,
        isCrossCutting: level.isCrossCutting,
        recordScope: level.recordScope,
        seesLabelOverride: level.seesLabelOverride ?? undefined,
        approvalLabelOverride: level.approvalLabelOverride ?? undefined,
        canEditLabel: level.canEditLabel ?? undefined,
      });
    } else {
      form.resetFields();
      form.setFieldsValue({ securityTier: "manager", isCrossCutting: false, recordScope: "own_and_below" });
    }
  }, [open, level, form]);

  const handleSubmit = async (values: FormValues) => {
    try {
      if (level) {
        await levelApi.updateLevel(level.id, {
          name: values.name,
          description: values.description,
          headcountLimit: values.headcountLimit ?? null,
          approvalCeiling: values.approvalCeiling ?? null,
          securityTier: values.securityTier,
          isCrossCutting: values.isCrossCutting,
          recordScope: values.recordScope,
          seesLabelOverride: values.seesLabelOverride ?? null,
          approvalLabelOverride: values.approvalLabelOverride ?? null,
          canEditLabel: values.canEditLabel ?? null,
        });
        message.success("Level updated");
      } else {
        await levelApi.createLevel({
          name: values.name,
          sortOrder: nextSortOrder,
          description: values.description,
          headcountLimit: values.headcountLimit,
          approvalCeiling: values.approvalCeiling,
          securityTier: values.securityTier,
          isCrossCutting: values.isCrossCutting,
          recordScope: values.recordScope,
          seesLabelOverride: values.seesLabelOverride,
          approvalLabelOverride: values.approvalLabelOverride,
          canEditLabel: values.canEditLabel,
        });
        message.success("Level added");
      }
      onSaved();
    } catch (err) {
      const description =
        isAxiosError<{ message?: string }>(err) && err.response?.data.message
          ? err.response.data.message
          : "Failed to save level - the name may already be taken";
      message.error(description);
    }
  };

  return (
    <Drawer
      title={level ? `Edit ${level.name}` : "Add level"}
      open={open}
      onClose={onClose}
      size="default"
      extra={
        <Space>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="primary" onClick={() => form.submit()}>
            {level ? "Save changes" : "Add level"}
          </Button>
        </Space>
      }
    >
      <Form<FormValues> form={form} layout="vertical" onFinish={handleSubmit}>
        <Form.Item name="name" label="Level name" rules={[{ required: true, message: "Name is required" }]}>
          <Input placeholder="e.g. Regional Sales Manager" />
        </Form.Item>
        <Form.Item name="description" label="Description">
          <Input placeholder="e.g. Zone owner - approves for the region" />
        </Form.Item>
        <Form.Item
          name="securityTier"
          label="Security tier"
          tooltip="What this level's people can actually do in the backend - the real access control, not just a label"
          rules={[{ required: true }]}
        >
          <Select options={SECURITY_TIER_OPTIONS} />
        </Form.Item>
        <Form.Item
          name="isCrossCutting"
          label="Cross-cutting role"
          valuePropName="checked"
          tooltip="On for roles like Administrator or Finance that sit outside the reporting ladder - they won't appear in the Org chart or the Designation ladder's drag-to-reorder list"
        >
          <Switch />
        </Form.Item>
        <Form.Item
          name="recordScope"
          label="Record scope"
          tooltip="Configuration only for now - the real leads/opportunities/activities visibility still uses the manager-subtree rule underneath, this just controls what the Roles & access screen displays"
          rules={[{ required: true }]}
        >
          <Select options={RECORD_SCOPE_OPTIONS} />
        </Form.Item>
        <Form.Item name="canEditLabel" label={'"Can edit" label'} tooltip="Shown as-is on the Roles & access table">
          <Input placeholder="e.g. Own tree" />
        </Form.Item>
        <Form.Item
          name="seesLabelOverride"
          label={'"Sees" label override'}
          tooltip="Leave blank to derive this from Record scope automatically - only set this for a role whose real visibility doesn't reduce to one of the 5 scope options, e.g. Finance's cross-cutting credit & billing view"
        >
          <Input placeholder="Leave blank unless this role is a genuine exception" />
        </Form.Item>
        <Form.Item
          name="approvalLabelOverride"
          label={'"Approves up to" label override'}
          tooltip="Leave blank to show the numeric approval ceiling below - only set this for a qualitative label like 'raises only' or 'credit only'"
        >
          <Input placeholder="Leave blank to use the numeric ceiling" />
        </Form.Item>
        <Form.Item
          name="headcountLimit"
          label="Headcount limit"
          tooltip="Leave blank for unlimited"
        >
          <InputNumber min={1} style={{ width: "100%" }} placeholder="Unlimited" />
        </Form.Item>
        <Form.Item
          name="approvalCeiling"
          label="Approval ceiling"
          tooltip="Configuration only for now - not yet enforced by any approval workflow"
        >
          <InputNumber min={0} prefix="₹" style={{ width: "100%" }} placeholder="No ceiling set" />
        </Form.Item>
        {level && (
          <Form.Item label="Current headcount">
            <Input value={level.currentHeadcount} disabled />
          </Form.Item>
        )}
      </Form>
    </Drawer>
  );
}
