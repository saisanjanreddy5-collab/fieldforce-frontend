import { useEffect, useMemo, useState } from "react";
import { Button, Card, DatePicker, Empty, Form, Input, Modal, Popconfirm, Select, Table, Tag, Typography, message } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { isAxiosError } from "axios";
import dayjs from "dayjs";
import * as userApi from "../api/user-api";
import * as scheduledTransferApi from "../api/scheduled-transfer-api";
import * as delegationApi from "../api/delegation-api";
import type { ScheduledTransfer, TransferType } from "../types/scheduled-transfer";
import type { Delegation } from "../types/delegation";
import type { TeamMember } from "../types/user";
import { useHasPermission } from "../hooks/use-permission";
import { appTokens } from "../utils/design-system";

const { Text } = Typography;

interface ReportingLinesCardProps {
  users: TeamMember[];
  onUsersChange?: () => void;
}

const TRANSFER_TYPE_OPTIONS: { value: TransferType; label: string }[] = [
  { value: "territory", label: "Territory change" },
  { value: "bulk_reassign", label: "Bulk re-assign" },
  { value: "exit", label: "Exit" },
];

interface TransferFormValues {
  transferType: TransferType;
  fromUserId: string;
  toUserId?: string;
  newTerritory?: string;
  effectiveDate: dayjs.Dayjs;
  note?: string;
}

interface DelegationFormValues {
  userId: string;
  delegateId: string;
  range: [dayjs.Dayjs, dayjs.Dayjs];
}

// Three things: (1) today's solid + dotted reporting lines with inline,
// immediate manager reassignment (same manager_change_log audit trail as
// before); (2) effective-dated Transfers & history - territory changes,
// scheduled bulk re-assigns and exits, applied lazily by
// scheduled-transfer-service.ts whenever this list is read, since there's
// no job scheduler in FieldForce; (3) Cover & delegation, foundation only -
// there's no live approval-request flow for a delegate to actually
// receive, so this just records who covers for whom and when.
export function ReportingLinesCard({ users, onUsersChange }: ReportingLinesCardProps) {
  const hasPermission = useHasPermission();
  const canCreateTransfer = hasPermission("territory_transfers.create");
  const canCreateDelegation = hasPermission("delegations.create");
  const [transfers, setTransfers] = useState<ScheduledTransfer[]>([]);
  const [delegations, setDelegations] = useState<Delegation[]>([]);
  const [loadingTransfers, setLoadingTransfers] = useState(true);
  const [loadingDelegations, setLoadingDelegations] = useState(true);
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [delegationModalOpen, setDelegationModalOpen] = useState(false);
  const [transferForm] = Form.useForm<TransferFormValues>();
  const [delegationForm] = Form.useForm<DelegationFormValues>();
  const transferType = Form.useWatch("transferType", transferForm);

  const loadTransfers = () => {
    setLoadingTransfers(true);
    scheduledTransferApi
      .listScheduledTransfers()
      .then(setTransfers)
      .catch(() => message.error("Failed to load transfer history"))
      .finally(() => setLoadingTransfers(false));
  };

  const loadDelegations = () => {
    setLoadingDelegations(true);
    delegationApi
      .listDelegations()
      .then(setDelegations)
      .catch(() => message.error("Failed to load delegations"))
      .finally(() => setLoadingDelegations(false));
  };

  useEffect(loadTransfers, []);
  useEffect(loadDelegations, []);

  const activeUsers = useMemo(() => users.filter((u) => u.isActive), [users]);
  const nameOf = (id: string | null) => (id ? users.find((u) => u.id === id)?.name ?? "Unknown" : null);

  const handleManagerChange = async (userId: string, managerId: string | undefined) => {
    try {
      await userApi.updateUser(userId, { managerId: managerId ?? "" });
      message.success("Reporting line updated");
      onUsersChange?.();
    } catch {
      message.error("Failed to update reporting line");
    }
  };

  const submitTransfer = async (values: TransferFormValues) => {
    try {
      const effectiveDate = values.effectiveDate.format("YYYY-MM-DD");
      if (values.transferType === "territory") {
        await scheduledTransferApi.createTerritoryTransfer({
          fromUserId: values.fromUserId,
          newTerritory: values.newTerritory!,
          effectiveDate,
          note: values.note,
        });
      } else if (values.transferType === "bulk_reassign") {
        await scheduledTransferApi.createScheduledReassign({
          fromUserId: values.fromUserId,
          toUserId: values.toUserId!,
          effectiveDate,
          note: values.note,
        });
      } else {
        await scheduledTransferApi.createExit({ fromUserId: values.fromUserId, effectiveDate });
      }
      message.success("Transfer scheduled");
      setTransferModalOpen(false);
      transferForm.resetFields();
      loadTransfers();
    } catch (err) {
      const description =
        isAxiosError<{ message?: string }>(err) && err.response?.data.message
          ? err.response.data.message
          : "Failed to schedule transfer";
      message.error(description);
    }
  };

  const submitDelegation = async (values: DelegationFormValues) => {
    try {
      await delegationApi.createDelegation({
        userId: values.userId,
        delegateId: values.delegateId,
        startDate: values.range[0].format("YYYY-MM-DD"),
        endDate: values.range[1].format("YYYY-MM-DD"),
      });
      message.success("Delegation added");
      setDelegationModalOpen(false);
      delegationForm.resetFields();
      loadDelegations();
    } catch (err) {
      const description =
        isAxiosError<{ message?: string }>(err) && err.response?.data.message
          ? err.response.data.message
          : "Failed to add delegation";
      message.error(description);
    }
  };

  const handleDeleteDelegation = async (id: string) => {
    try {
      await delegationApi.deleteDelegation(id);
      message.success("Delegation removed");
      loadDelegations();
    } catch {
      message.error("Failed to remove delegation");
    }
  };

  const transferSummary = (t: ScheduledTransfer) => {
    if (t.transferType === "territory") return `${nameOf(t.fromUserId)} → ${t.newTerritory}`;
    if (t.transferType === "bulk_reassign") return `${nameOf(t.fromUserId)} → ${nameOf(t.toUserId)}`;
    return `${nameOf(t.fromUserId)} — exit`;
  };

  const transferNote = (t: ScheduledTransfer) => {
    if (t.note) return t.note;
    if (t.transferType === "territory") return `From ${t.oldTerritory ?? "no territory"} to ${t.newTerritory}. ${t.leadCount} lead${t.leadCount === 1 ? "" : "s"} move on the date.`;
    if (t.transferType === "bulk_reassign")
      return `${t.leadCount} lead${t.leadCount === 1 ? "" : "s"} and ${t.opportunityCount} open opportunit${t.opportunityCount === 1 ? "y" : "ies"} move on the effective date.`;
    return "";
  };

  return (
    <Card size="small" style={{ marginBottom: 16 }}>
      <Text strong>Reporting lines</Text>
      <div>
        <Text type="secondary" style={{ fontSize: 12 }}>
          Reporting manager, dotted lines, transfers and cover
        </Text>
      </div>

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 12 }}>
        <div style={{ flex: "1 1 420px", minWidth: 320 }}>
          <Text strong style={{ fontSize: 13, display: "block", marginBottom: 4 }}>
            Who reports to whom
          </Text>
          <Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 8 }}>
            Change a manager here and the visibility tree follows immediately
          </Text>
          <Table
            size="small"
            rowKey="id"
            dataSource={activeUsers}
            pagination={{ pageSize: 8, size: "small" }}
            columns={[
              { title: "Name", dataIndex: "name" },
              {
                title: "Reports to",
                key: "managerId",
                render: (_, u) =>
                  hasPermission("users.update") ? (
                    <Select
                      size="small"
                      style={{ width: 180 }}
                      allowClear
                      showSearch
                      optionFilterProp="label"
                      placeholder="Top of org"
                      value={u.managerId ?? undefined}
                      onChange={(v) => handleManagerChange(u.id, v)}
                      options={activeUsers.filter((cand) => cand.id !== u.id).map((cand) => ({ value: cand.id, label: cand.name }))}
                    />
                  ) : (
                    nameOf(u.managerId) ?? <Text type="secondary">Top of org</Text>
                  ),
              },
              {
                title: "Dotted line",
                dataIndex: "dottedLineManagerId",
                render: (id: string | null) => (id ? <Tag color="purple">{nameOf(id)}</Tag> : "-"),
              },
            ]}
          />
        </div>

        <div style={{ flex: "1 1 380px", minWidth: 300 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
            <Text strong style={{ fontSize: 13 }}>
              Transfers & history
            </Text>
            {canCreateTransfer && (
              <Button size="small" icon={<PlusOutlined />} onClick={() => setTransferModalOpen(true)}>
                Add transfer
              </Button>
            )}
          </div>
          <Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 8 }}>
            Effective-dated - records move on the date, history stays attributed to who owned them before
          </Text>
          {loadingTransfers ? null : transfers.length === 0 ? (
            <Empty description="No transfers yet" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          ) : (
            <div style={{ maxHeight: 320, overflowY: "auto" }}>
              {transfers.map((t) => (
                <div
                  key={t.id}
                  style={{
                    border: `1px solid ${appTokens.border}`,
                    borderRadius: appTokens.radius,
                    padding: 10,
                    marginBottom: 8,
                    background: appTokens.surface,
                    boxShadow: appTokens.shadowXs,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <Text strong style={{ fontSize: 13 }}>
                      {transferSummary(t)}
                    </Text>
                    <Tag color={t.status === "completed" ? "green" : "blue"}>{dayjs(t.effectiveDate).format("DD MMM YYYY")}</Tag>
                  </div>
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    {t.status === "completed" ? "Completed. " : ""}
                    {transferNote(t)}
                  </Text>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16, marginBottom: 4 }}>
            <Text strong style={{ fontSize: 13 }}>
              Cover & delegation
            </Text>
            {canCreateDelegation && (
              <Button size="small" icon={<PlusOutlined />} onClick={() => setDelegationModalOpen(true)}>
                Add
              </Button>
            )}
          </div>
          <Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 8 }}>
            Configuration only - FieldForce has no live approval flow for a delegate to receive yet
          </Text>
          {loadingDelegations ? null : delegations.length === 0 ? (
            <Empty description="No delegations set" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          ) : (
            delegations.map((d) => (
              <div
                key={d.id}
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderTop: `1px solid ${appTokens.borderLight}` }}
              >
                <Text style={{ fontSize: 12 }}>
                  {nameOf(d.userId)} → {nameOf(d.delegateId)}
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    {" "}
                    ({d.startDate} to {d.endDate})
                  </Text>
                </Text>
                {canCreateDelegation && (
                  <Popconfirm title="Remove this delegation?" onConfirm={() => handleDeleteDelegation(d.id)}>
                    <Button type="link" size="small" danger>
                      Remove
                    </Button>
                  </Popconfirm>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      <Modal
        title="Add transfer"
        open={transferModalOpen}
        onCancel={() => setTransferModalOpen(false)}
        onOk={() => transferForm.submit()}
        okText="Schedule"
      >
        <Form<TransferFormValues> form={transferForm} layout="vertical" onFinish={submitTransfer} initialValues={{ transferType: "territory" }}>
          <Form.Item name="transferType" label="Type" rules={[{ required: true }]}>
            <Select options={TRANSFER_TYPE_OPTIONS} />
          </Form.Item>
          <Form.Item name="fromUserId" label={transferType === "bulk_reassign" ? "Move leads from" : "Person"} rules={[{ required: true, message: "Pick a person" }]}>
            <Select showSearch optionFilterProp="label" options={activeUsers.map((u) => ({ value: u.id, label: u.name }))} />
          </Form.Item>
          {transferType === "territory" && (
            <Form.Item name="newTerritory" label="New territory" rules={[{ required: true, message: "Enter the new territory" }]}>
              <Input placeholder="e.g. North zone" />
            </Form.Item>
          )}
          {transferType === "bulk_reassign" && (
            <Form.Item name="toUserId" label="Move leads to" rules={[{ required: true, message: "Pick a person" }]}>
              <Select showSearch optionFilterProp="label" options={activeUsers.map((u) => ({ value: u.id, label: u.name }))} />
            </Form.Item>
          )}
          <Form.Item name="effectiveDate" label="Effective date" rules={[{ required: true, message: "Pick an effective date" }]}>
            <DatePicker style={{ width: "100%" }} />
          </Form.Item>
          {transferType !== "exit" && (
            <Form.Item name="note" label="Note (optional)">
              <Input.TextArea rows={2} />
            </Form.Item>
          )}
        </Form>
      </Modal>

      <Modal
        title="Add delegation"
        open={delegationModalOpen}
        onCancel={() => setDelegationModalOpen(false)}
        onOk={() => delegationForm.submit()}
        okText="Add"
      >
        <Form<DelegationFormValues> form={delegationForm} layout="vertical" onFinish={submitDelegation}>
          <Form.Item name="userId" label="Person" rules={[{ required: true, message: "Pick a person" }]}>
            <Select showSearch optionFilterProp="label" options={activeUsers.map((u) => ({ value: u.id, label: u.name }))} />
          </Form.Item>
          <Form.Item name="delegateId" label="Delegate" rules={[{ required: true, message: "Pick a delegate" }]}>
            <Select showSearch optionFilterProp="label" options={activeUsers.map((u) => ({ value: u.id, label: u.name }))} />
          </Form.Item>
          <Form.Item name="range" label="Cover period" rules={[{ required: true, message: "Pick a date range" }]}>
            <DatePicker.RangePicker style={{ width: "100%" }} />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
