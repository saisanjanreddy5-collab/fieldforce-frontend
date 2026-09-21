import { useEffect, useMemo, useState } from "react";
import { Button, Card, DatePicker, Form, Modal, Progress, Select, Table, Typography, message } from "antd";
import { SwapOutlined } from "@ant-design/icons";
import { isAxiosError } from "axios";
import dayjs from "dayjs";
import * as dashboardApi from "../api/dashboard-api";
import * as scheduledTransferApi from "../api/scheduled-transfer-api";
import * as classificationApi from "../api/classification-api";
import type { TeamPerformanceStat } from "../types/dashboard";
import type { TeamMember } from "../types/user";
import type { Target } from "../types/target";
import type { DivisionChannel } from "../types/classification";
import { formatCompactCurrency } from "../utils/lead-format";
import { resolveCurrentTarget } from "../utils/target-format";
import { useHasPermission } from "../hooks/use-permission";

const { Text } = Typography;

interface TerritoryTargetsCardProps {
  users: TeamMember[];
  targets: Target[];
}

interface ReassignFormValues {
  fromUserId: string;
  toUserId: string;
  effectiveDate: dayjs.Dayjs;
}

// "Accounts" and span come from /dashboard/team-performance (already subtree
// scoped, already live for the Dashboard page) - reused here rather than
// building a second aggregation endpoint. Bulk re-assign is effective-dated
// now (scheduled-transfer-service.ts), same lazy-apply mechanism as
// Reporting lines' Transfers & history - the preview counts below reuse the
// same team-performance data already loaded for the table, rather than a
// second endpoint just for the modal.
export function TerritoryTargetsCard({ users, targets }: TerritoryTargetsCardProps) {
  const hasPermission = useHasPermission();
  const [performance, setPerformance] = useState<TeamPerformanceStat[]>([]);
  const [divisionChannels, setDivisionChannels] = useState<DivisionChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [reassignOpen, setReassignOpen] = useState(false);
  const [reassigning, setReassigning] = useState(false);
  const [form] = Form.useForm<ReassignFormValues>();
  const fromUserId = Form.useWatch("fromUserId", form);

  const load = () => {
    setLoading(true);
    dashboardApi
      .getTeamPerformance()
      .then(setPerformance)
      .catch(() => message.error("Failed to load territory & targets rollup"))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);
  useEffect(() => {
    classificationApi.listDivisionChannels().then(setDivisionChannels).catch(() => undefined);
  }, []);

  const activeUsers = useMemo(() => users.filter((u) => u.isActive), [users]);
  const performanceById = useMemo(() => new Map(performance.map((p) => [p.userId, p])), [performance]);
  const spanById = useMemo(() => {
    const counts = new Map<string, number>();
    for (const u of activeUsers) {
      if (!u.managerId) continue;
      counts.set(u.managerId, (counts.get(u.managerId) ?? 0) + 1);
    }
    return counts;
  }, [activeUsers]);

  const rows = useMemo(
    () =>
      activeUsers.map((u) => ({
        user: u,
        target: resolveCurrentTarget(u.id, targets),
        accounts: performanceById.get(u.id)?.leadsOwned ?? 0,
        span: spanById.get(u.id) ?? 0,
      })),
    [activeUsers, targets, performanceById, spanById]
  );

  const divisionChannelLabel = (id: string | null) => divisionChannels.find((d) => d.id === id)?.label ?? "-";

  const openReassign = () => {
    form.resetFields();
    setReassignOpen(true);
  };

  const fromPreview = fromUserId ? performanceById.get(fromUserId) : undefined;

  const handleReassign = async (values: ReassignFormValues) => {
    if (values.fromUserId === values.toUserId) {
      message.error("Source and destination must be different people");
      return;
    }
    setReassigning(true);
    try {
      await scheduledTransferApi.createScheduledReassign({
        fromUserId: values.fromUserId,
        toUserId: values.toUserId,
        effectiveDate: values.effectiveDate.format("YYYY-MM-DD"),
      });
      message.success("Bulk re-assign scheduled");
      setReassignOpen(false);
    } catch (err) {
      const description =
        isAxiosError<{ message?: string }>(err) && err.response?.data.message
          ? err.response.data.message
          : "Failed to schedule bulk re-assign - both people must be within your reporting tree";
      message.error(description);
    } finally {
      setReassigning(false);
    }
  };

  return (
    <Card size="small" style={{ marginBottom: 16 }} loading={loading}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
        <div>
          <Text strong>Territory & targets</Text>
          <div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Quota vs achieved, account load, and span - one row per active salesperson
            </Text>
          </div>
        </div>
        {hasPermission("leads.update") && (
          <Button size="small" icon={<SwapOutlined />} onClick={openReassign}>
            Bulk re-assign
          </Button>
        )}
      </div>

      <Table
        size="small"
        style={{ marginTop: 12 }}
        rowKey={(row) => row.user.id}
        dataSource={rows}
        pagination={false}
        columns={[
          { title: "Name", key: "name", render: (_, row) => row.user.name },
          { title: "Territory", key: "territory", render: (_, row) => row.user.territory ?? "-" },
          { title: "Division / channel", key: "division", render: (_, row) => divisionChannelLabel(row.user.divisionChannelId) },
          { title: "Quota", key: "quota", render: (_, row) => (row.target ? formatCompactCurrency(row.target.targetAmount) : "-") },
          { title: "Achieved", key: "achieved", render: (_, row) => (row.target ? formatCompactCurrency(row.target.achievedAmount) : "-") },
          {
            title: "Achievement %",
            key: "achievementPercent",
            width: 140,
            render: (_, row) =>
              row.target ? (
                <Progress percent={Math.min(row.target.achievementPercent, 100)} size="small" format={() => `${row.target!.achievementPercent}%`} />
              ) : (
                "-"
              ),
          },
          { title: "Accounts", key: "accounts", render: (_, row) => row.accounts },
          { title: "Span", key: "span", render: (_, row) => row.span },
        ]}
        scroll={{ x: "max-content" }}
      />

      <Modal
        title="Bulk re-assign leads"
        open={reassignOpen}
        onCancel={() => setReassignOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={reassigning}
        okText="Schedule"
      >
        <Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 12 }}>
          Moves every lead (and its open opportunities) from the first person to the second on the effective date.
          History before that date stays attributed to the original owner. Both people must be within your own
          reporting tree.
        </Text>
        <Form<ReassignFormValues> form={form} layout="vertical" onFinish={handleReassign}>
          <Form.Item name="fromUserId" label="Move leads from" rules={[{ required: true, message: "Pick a person" }]}>
            <Select
              showSearch
              optionFilterProp="label"
              placeholder="Select a person"
              options={activeUsers.map((u) => ({ value: u.id, label: `${u.name} (${u.role})` }))}
            />
          </Form.Item>
          {fromPreview && (
            <Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 12 }}>
              {fromPreview.leadsOwned} lead{fromPreview.leadsOwned === 1 ? "" : "s"} and {fromPreview.opportunitiesOwned} open
              opportunit{fromPreview.opportunitiesOwned === 1 ? "y" : "ies"} will move.
            </Text>
          )}
          <Form.Item name="toUserId" label="Move leads to" rules={[{ required: true, message: "Pick a person" }]}>
            <Select
              showSearch
              optionFilterProp="label"
              placeholder="Select a person"
              options={activeUsers.map((u) => ({ value: u.id, label: `${u.name} (${u.role})` }))}
            />
          </Form.Item>
          <Form.Item name="effectiveDate" label="Effective date" rules={[{ required: true, message: "Pick an effective date" }]}>
            <DatePicker style={{ width: "100%" }} />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
