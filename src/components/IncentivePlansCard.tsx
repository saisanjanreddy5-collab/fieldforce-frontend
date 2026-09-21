import { useEffect, useState } from "react";
import { Button, Card, Space, Table, Tag, Typography, message } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import * as incentivePlanApi from "../api/incentive-plan-api";
import type { IncentivePlan } from "../types/incentive-plan";
import { useHasPermission } from "../hooks/use-permission";
import { IncentivePlanDrawer } from "./IncentivePlanDrawer";

const { Text } = Typography;

// Same visual language as Sales teams/Offices/Levels on this page, just a
// full Table instead of a tag list since a plan has more structure (dates,
// status, nested commission rules) than a simple named reference item.
export function IncentivePlansCard() {
  const hasPermission = useHasPermission();
  const [plans, setPlans] = useState<IncentivePlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<IncentivePlan | null>(null);

  const load = () => {
    setLoading(true);
    incentivePlanApi
      .listIncentivePlans()
      .then(setPlans)
      .catch(() => message.error("Failed to load incentive plans"))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const openCreate = () => {
    setEditingPlan(null);
    setDrawerOpen(true);
  };

  const openEdit = (plan: IncentivePlan) => {
    setEditingPlan(plan);
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setEditingPlan(null);
  };

  const handleSaved = () => {
    closeDrawer();
    load();
  };

  const toggleActive = async (plan: IncentivePlan) => {
    try {
      await incentivePlanApi.updateIncentivePlan(plan.id, { isActive: !plan.isActive });
      message.success(plan.isActive ? "Plan deactivated" : "Plan activated");
      load();
    } catch {
      message.error("Failed to update plan status");
    }
  };

  return (
    <Card size="small" style={{ marginBottom: 16 }} loading={loading}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
        <div>
          <Text strong>Incentive plans</Text>
          <div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Configuration only - no commission or payout is calculated yet
            </Text>
          </div>
        </div>
        {hasPermission("incentive_plans.create") && (
          <Button size="small" type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            New plan
          </Button>
        )}
      </div>
      <Table<IncentivePlan>
        size="small"
        rowKey="id"
        dataSource={plans}
        pagination={false}
        locale={{ emptyText: "No incentive plans yet - create one above" }}
        columns={[
          { title: "Name", dataIndex: "name" },
          { title: "Description", dataIndex: "description", render: (v: string | null) => v ?? "-" },
          {
            title: "Effective",
            key: "effective",
            render: (_, plan) => `${plan.effectiveStartDate} ${plan.effectiveEndDate ? `to ${plan.effectiveEndDate}` : "onward"}`,
          },
          {
            title: "Status",
            dataIndex: "isActive",
            render: (isActive: boolean) => <Tag color={isActive ? "green" : "default"}>{isActive ? "Active" : "Inactive"}</Tag>,
          },
          {
            title: "",
            key: "actions",
            render: (_, plan) =>
              hasPermission("incentive_plans.update") ? (
                <Space size={4}>
                  <Button type="link" size="small" onClick={() => openEdit(plan)}>
                    Edit
                  </Button>
                  <Button type="link" size="small" onClick={() => toggleActive(plan)}>
                    {plan.isActive ? "Deactivate" : "Activate"}
                  </Button>
                </Space>
              ) : null,
          },
        ]}
      />
      <IncentivePlanDrawer open={drawerOpen} plan={editingPlan} onClose={closeDrawer} onSaved={handleSaved} />
    </Card>
  );
}
