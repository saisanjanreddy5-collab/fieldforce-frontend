import { useEffect } from "react";
import { Button, Checkbox, Drawer, Form, Input, Select, Space, message } from "antd";
import { isAxiosError } from "axios";
import * as officeApi from "../api/office-api";
import type { Office } from "../types/office";
import type { Zone } from "../types/sales-team";

interface FormValues {
  name: string;
  code?: string;
  address?: string;
  zoneId?: string;
  phone?: string;
  isActive: boolean;
}

interface OfficeDrawerProps {
  open: boolean;
  office: Office | null;
  zones: Zone[];
  onClose: () => void;
  onSaved: () => void;
}

export function OfficeDrawer({ open, office, zones, onClose, onSaved }: OfficeDrawerProps) {
  const [form] = Form.useForm<FormValues>();

  useEffect(() => {
    if (!open) return;
    if (office) {
      form.setFieldsValue({
        name: office.name,
        code: office.code ?? undefined,
        address: office.address ?? undefined,
        zoneId: office.zoneId ?? undefined,
        phone: office.phone ?? undefined,
        isActive: office.isActive,
      });
    } else {
      form.resetFields();
    }
  }, [open, office, form]);

  const handleSubmit = async (values: FormValues) => {
    try {
      if (office) {
        await officeApi.updateOffice(office.id, values);
        message.success("Office updated");
      } else {
        await officeApi.createOffice(values);
        message.success("Office created");
      }
      onSaved();
    } catch (err) {
      const description =
        isAxiosError<{ message?: string }>(err) && err.response?.data.message
          ? err.response.data.message
          : "Failed to save office";
      message.error(description);
    }
  };

  return (
    <Drawer
      title={office ? `Edit ${office.name}` : "New office"}
      open={open}
      onClose={onClose}
      size="default"
      extra={
        <Space>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="primary" onClick={() => form.submit()}>
            {office ? "Save changes" : "Create office"}
          </Button>
        </Space>
      }
    >
      <Form<FormValues> form={form} layout="vertical" onFinish={handleSubmit} initialValues={{ isActive: true }}>
        <Form.Item name="name" label="Office name" rules={[{ required: true, message: "Name is required" }]}>
          <Input placeholder="e.g. Pune regional office" />
        </Form.Item>
        <Form.Item name="code" label="Office code">
          <Input placeholder="e.g. PUN-01 (optional)" />
        </Form.Item>
        <Form.Item name="zoneId" label="Region">
          <Select allowClear placeholder="Select a region" options={zones.map((z) => ({ value: z.id, label: z.name }))} />
        </Form.Item>
        <Form.Item name="address" label="Address">
          <Input.TextArea placeholder="Office address" rows={2} />
        </Form.Item>
        <Form.Item name="phone" label="Phone">
          <Input placeholder="e.g. 020 12345678" />
        </Form.Item>
        <Form.Item name="isActive" valuePropName="checked">
          <Checkbox>Active</Checkbox>
        </Form.Item>
        {office && (
          <Form.Item label="Employees assigned">
            <Input value={office.employeeCount} disabled />
          </Form.Item>
        )}
      </Form>
    </Drawer>
  );
}
