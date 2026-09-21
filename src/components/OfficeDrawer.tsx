import { useEffect, useState } from "react";
import { Button, Checkbox, Drawer, Form, Input, Select, Space, message } from "antd";
import { isAxiosError } from "axios";
import * as officeApi from "../api/office-api";
import * as salesTeamApi from "../api/sales-team-api";
import type { Office, OfficeType } from "../types/office";
import type { State, Zone } from "../types/sales-team";
import { OFFICE_TYPE_OPTIONS } from "./OfficesCard";

interface FormValues {
  name: string;
  code?: string;
  type?: OfficeType;
  address?: string;
  addressLine2?: string;
  city?: string;
  pincode?: string;
  zoneId?: string;
  stateId?: string;
  phone?: string;
  locationTag?: string;
  isActive: boolean;
}

interface OfficeDrawerProps {
  open: boolean;
  office: Office | null;
  zones: Zone[];
  onClose: () => void;
  onSaved: () => void;
}

// "Location tag" is a single "lat, lng" input, matching the reference
// mockup's own field exactly - parsed into two numbers on submit rather
// than exposing separate Latitude/Longitude inputs.
function parseLocationTag(value: string | undefined): { latitude?: number; longitude?: number } {
  if (!value || !value.trim()) return {};
  const parts = value.split(",").map((p) => Number(p.trim()));
  if (parts.length !== 2 || parts.some((n) => Number.isNaN(n))) return {};
  return { latitude: parts[0], longitude: parts[1] };
}

export function OfficeDrawer({ open, office, zones, onClose, onSaved }: OfficeDrawerProps) {
  const [form] = Form.useForm<FormValues>();
  const [states, setStates] = useState<State[]>([]);
  const zoneId = Form.useWatch("zoneId", form);

  useEffect(() => {
    if (!open) return;
    if (office) {
      form.setFieldsValue({
        name: office.name,
        code: office.code ?? undefined,
        type: office.type ?? undefined,
        address: office.address ?? undefined,
        addressLine2: office.addressLine2 ?? undefined,
        city: office.city ?? undefined,
        pincode: office.pincode ?? undefined,
        zoneId: office.zoneId ?? undefined,
        stateId: office.stateId ?? undefined,
        phone: office.phone ?? undefined,
        locationTag: office.latitude !== null && office.longitude !== null ? `${office.latitude}, ${office.longitude}` : undefined,
        isActive: office.isActive,
      });
    } else {
      form.resetFields();
    }
  }, [open, office, form]);

  // Same race-safe pattern as the People wizard's Region -> State cascade:
  // the stale-selection check runs against the freshly resolved list, not
  // the `states` state variable, which would otherwise still hold the
  // previous (or empty, on first load) list for one render.
  useEffect(() => {
    if (!open) return;
    salesTeamApi
      .listStates(zoneId || undefined)
      .then((fetchedStates) => {
        setStates(fetchedStates);
        const current = form.getFieldValue("stateId");
        if (current && !fetchedStates.some((s) => s.id === current)) {
          form.setFieldValue("stateId", undefined);
        }
      })
      .catch(() => setStates([]));
  }, [open, zoneId, form]);

  const handleSubmit = async (values: FormValues) => {
    try {
      const { locationTag, ...rest } = values;
      const payload = { ...rest, ...parseLocationTag(locationTag) };
      if (office) {
        await officeApi.updateOffice(office.id, payload);
        message.success("Office updated");
      } else {
        await officeApi.createOffice(payload);
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
      title={office ? `Edit ${office.name}` : "Create an office"}
      open={open}
      onClose={onClose}
      size="default"
      extra={
        <Space>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="primary" onClick={() => form.submit()}>
            {office ? "Save office" : "Save office"}
          </Button>
        </Space>
      }
    >
      <Form<FormValues> form={form} layout="vertical" onFinish={handleSubmit} initialValues={{ isActive: true }}>
        <Form.Item name="name" label="Office name" rules={[{ required: true, message: "Name is required" }]}>
          <Input placeholder="e.g. Pune regional office" />
        </Form.Item>
        <Form.Item name="type" label="Type">
          <Select allowClear placeholder="Select a type" options={OFFICE_TYPE_OPTIONS} />
        </Form.Item>
        <Form.Item name="code" label="Office code">
          <Input placeholder="e.g. PUN-01 (optional)" />
        </Form.Item>
        <Form.Item name="zoneId" label="Region">
          <Select allowClear placeholder="Select a region" options={zones.map((z) => ({ value: z.id, label: z.name }))} />
        </Form.Item>
        <Form.Item name="address" label="Address line 1">
          <Input placeholder="e.g. 4th floor, Amar Tech Park" />
        </Form.Item>
        <Form.Item name="addressLine2" label="Address line 2">
          <Input placeholder="e.g. Balewadi High Street" />
        </Form.Item>
        <Form.Item name="city" label="City">
          <Input placeholder="e.g. Pune" />
        </Form.Item>
        <Form.Item name="stateId" label="State (GST)">
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            placeholder={zoneId ? "Select a state" : "Select a region first"}
            disabled={!zoneId}
            options={states.map((s) => ({ value: s.id, label: s.gstCode ? `${s.name} · ${s.gstCode}` : s.name }))}
          />
        </Form.Item>
        <Form.Item name="pincode" label="Pin code">
          <Input placeholder="e.g. 411045" />
        </Form.Item>
        <Form.Item name="phone" label="Phone">
          <Input placeholder="e.g. 020 12345678" />
        </Form.Item>
        <Form.Item
          name="locationTag"
          label="Location tag"
          tooltip="Used for field check-ins, distance-based expense claims and the office column on every employee record"
        >
          <Input placeholder="e.g. 18.5679, 73.7692" />
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
