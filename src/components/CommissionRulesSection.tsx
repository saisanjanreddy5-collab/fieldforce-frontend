import { useEffect, useState } from "react";
import { Button, Checkbox, Form, Input, Popconfirm, Space, Table, Tag, Typography, message } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { isAxiosError } from "axios";
import * as commissionRuleApi from "../api/commission-rule-api";
import type { CommissionRule } from "../types/commission-rule";
import { useHasPermission } from "../hooks/use-permission";

const { Text } = Typography;

interface FormValues {
  name: string;
  ruleType?: string;
  description?: string;
  isActive: boolean;
}

interface CommissionRulesSectionProps {
  incentivePlanId: string;
}

// Configuration only - there is no percentage/amount/threshold field here
// on purpose. Nothing calculates a payout from these rows; this is just a
// labeled place to describe a future rule until its real formula is
// defined. Mirrors TargetsSection's list + inline create/edit/delete shape.
export function CommissionRulesSection({ incentivePlanId }: CommissionRulesSectionProps) {
  const hasPermission = useHasPermission();
  const [rules, setRules] = useState<CommissionRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm<FormValues>();

  const load = () => {
    setLoading(true);
    commissionRuleApi
      .listCommissionRules(incentivePlanId)
      .then(setRules)
      .catch(() => message.error("Failed to load commission rules"))
      .finally(() => setLoading(false));
  };

  useEffect(load, [incentivePlanId]);

  const startCreate = () => {
    setEditingRuleId(null);
    form.resetFields();
  };

  const startEdit = (rule: CommissionRule) => {
    setEditingRuleId(rule.id);
    form.setFieldsValue({
      name: rule.name,
      ruleType: rule.ruleType ?? undefined,
      description: rule.description ?? undefined,
      isActive: rule.isActive,
    });
  };

  const handleDelete = async (id: string) => {
    try {
      await commissionRuleApi.deleteCommissionRule(id);
      message.success("Commission rule deleted");
      if (editingRuleId === id) startCreate();
      load();
    } catch {
      message.error("Failed to delete commission rule");
    }
  };

  const handleSubmit = async (values: FormValues) => {
    setSaving(true);
    try {
      const payload = {
        name: values.name,
        ruleType: values.ruleType,
        description: values.description,
        isActive: values.isActive,
      };
      if (editingRuleId) {
        await commissionRuleApi.updateCommissionRule(editingRuleId, payload);
        message.success("Commission rule updated");
      } else {
        await commissionRuleApi.createCommissionRule({ incentivePlanId, ...payload });
        message.success("Commission rule added");
      }
      form.resetFields();
      setEditingRuleId(null);
      load();
    } catch (err) {
      const description =
        isAxiosError<{ message?: string }>(err) && err.response?.data.message
          ? err.response.data.message
          : "Failed to save commission rule";
      message.error(description);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ marginBottom: 16 }}>
      <Text strong>Commission rules</Text>
      <div>
        <Text type="secondary" style={{ fontSize: 12 }}>
          Configuration only - no payout is calculated from these yet
        </Text>
      </div>
      <Table<CommissionRule>
        size="small"
        rowKey="id"
        loading={loading}
        dataSource={rules}
        pagination={false}
        style={{ marginTop: 8, marginBottom: 12 }}
        locale={{ emptyText: "No commission rules yet - add one below" }}
        columns={[
          { title: "Name", dataIndex: "name" },
          { title: "Type", dataIndex: "ruleType", render: (v: string | null) => v ?? "-" },
          { title: "Description", dataIndex: "description", render: (v: string | null) => v ?? "-" },
          {
            title: "Status",
            dataIndex: "isActive",
            render: (isActive: boolean) => <Tag color={isActive ? "green" : "default"}>{isActive ? "Active" : "Inactive"}</Tag>,
          },
          {
            title: "",
            key: "actions",
            render: (_, rule) => (
              <Space size={4}>
                {hasPermission("commission_rules.update") && (
                  <Button type="link" size="small" onClick={() => startEdit(rule)}>
                    Edit
                  </Button>
                )}
                {hasPermission("commission_rules.delete") && (
                  <Popconfirm title="Delete this commission rule?" onConfirm={() => handleDelete(rule.id)}>
                    <Button type="link" size="small" danger>
                      Delete
                    </Button>
                  </Popconfirm>
                )}
              </Space>
            ),
          },
        ]}
      />
      {(editingRuleId ? hasPermission("commission_rules.update") : hasPermission("commission_rules.create")) && (
        <Form<FormValues> form={form} layout="inline" onFinish={handleSubmit} initialValues={{ isActive: true }}>
          <Form.Item name="name" rules={[{ required: true, message: "Name is required" }]}>
            <Input placeholder="Rule name" style={{ width: 160 }} />
          </Form.Item>
          <Form.Item name="ruleType">
            <Input placeholder="Type (e.g. Percentage-based)" style={{ width: 200 }} />
          </Form.Item>
          <Form.Item name="description">
            <Input placeholder="Description / notes" style={{ width: 220 }} />
          </Form.Item>
          <Form.Item name="isActive" valuePropName="checked">
            <Checkbox>Active</Checkbox>
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" icon={<PlusOutlined />} loading={saving}>
                {editingRuleId ? "Save" : "Add"}
              </Button>
              {editingRuleId && <Button onClick={startCreate}>Cancel</Button>}
            </Space>
          </Form.Item>
        </Form>
      )}
    </div>
  );
}
