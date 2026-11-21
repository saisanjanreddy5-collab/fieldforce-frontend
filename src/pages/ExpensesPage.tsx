import { useEffect, useMemo, useState } from "react";
import { Avatar, Button, Drawer, Empty, Table, Tag, Typography, message } from "antd";
import { PlusOutlined, InfoCircleOutlined } from "@ant-design/icons";
import { useSearchParams } from "react-router-dom";
import dayjs from "dayjs";
import * as expenseApi from "../api/expense-api";
import type { ExpenseClaim, ExpenseClaimStatus, ExpenseType, ExpenseTypeKey } from "../types/expense";
import { useAuth } from "../context/AuthContext";
import { useHasPermission } from "../hooks/use-permission";
import { appTokens, avatarGradient } from "../utils/design-system";
import { StatsRow } from "../components/StatsRow";
import { ListPagination } from "../components/ListPagination";
import { usePagination } from "../hooks/use-pagination";
import { initials, formatCompactCurrency, formatExactCurrency } from "../utils/lead-format";
import { formatExpenseDate, limitUnitSuffix } from "../utils/expense-format";
import { EXPENSE_TYPE_ICON } from "../utils/expense-icons";
import { errorMessageFrom } from "../utils/api-error";
import { NewExpenseClaimModal } from "../components/expenses/NewExpenseClaimModal";
import { RequestDetailsModal, type ApprovalStep } from "../components/approvals/RequestDetailsModal";

const { Title, Text } = Typography;

const STATUS_COLOR: Record<ExpenseClaimStatus, string> = {
  pending: appTokens.warning,
  approved: appTokens.success,
  rejected: appTokens.danger,
  paid: appTokens.primary,
};

type StatusFilter = "all" | ExpenseClaimStatus;

export default function ExpensesPage() {
  const { user } = useAuth();
  const hasPermission = useHasPermission();
  const canApprove = hasPermission("expense_claims.approve");
  const canMarkPaid = hasPermission("expense_claims.mark_paid");
  // Admins see every claim in the company (view only) - approving stays with
  // each claim's own approver, so their rows show no Approve/Reject.
  const canViewAll = hasPermission("expense_claims.view_all");
  const [viewing, setViewing] = useState<ExpenseClaim | null>(null);

  const [types, setTypes] = useState<ExpenseType[]>([]);
  const [myClaims, setMyClaims] = useState<ExpenseClaim[]>([]);
  const [teamClaims, setTeamClaims] = useState<ExpenseClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [newClaimOpen, setNewClaimOpen] = useState(false);
  const [policyDrawerOpen, setPolicyDrawerOpen] = useState(false);
  const [prefillTypeKey, setPrefillTypeKey] = useState<ExpenseTypeKey | undefined>();
  const [searchParams, setSearchParams] = useSearchParams();
  // Which row action is in flight - drives that button's spinner and
  // blocks double-taps (a second Approve tap would otherwise fire a second
  // request against an already-decided claim).
  const [acting, setActing] = useState<{ id: string; action: "approved" | "rejected" | "paid" } | null>(null);

  // Opens pre-filled when arriving from a cross-module handoff (the Activity
  // calendar's site-visit "Log fuel expense" button). The param is captured
  // into its own state and cleared from the URL right away - clearing it
  // immediately from searchParams too (rather than keeping prefillTypeKey
  // read live off the URL) means a page refresh afterward doesn't reopen
  // the modal, while the modal still gets a stable value to prefill from.
  useEffect(() => {
    const param = searchParams.get("newClaim") as ExpenseTypeKey | null;
    if (!param) return;
    setPrefillTypeKey(param);
    setNewClaimOpen(true);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete("newClaim");
        return next;
      },
      { replace: true }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const load = () => {
    setLoading(true);
    Promise.all([expenseApi.listExpenseTypes(), expenseApi.listMyClaims(), canApprove || canViewAll ? expenseApi.listTeamClaims() : Promise.resolve([])])
      .then(([typesResult, mineResult, teamResult]) => {
        setTypes(typesResult);
        setMyClaims(mineResult);
        setTeamClaims(teamResult);
      })
      .catch(() => message.error("Failed to load expense data"))
      .finally(() => setLoading(false));
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, []);

  // A manager's claims and their team's claims share one combined view -
  // unlike Leave, the reference here never splits "mine" from "team" into
  // separate tabs, since overseeing team spend is the point of this screen.
  const allClaims = useMemo(() => [...myClaims, ...teamClaims], [myClaims, teamClaims]);

  const counts = useMemo(
    () => ({
      all: allClaims.length,
      pending: allClaims.filter((c) => c.status === "pending").length,
      approved: allClaims.filter((c) => c.status === "approved").length,
      rejected: allClaims.filter((c) => c.status === "rejected").length,
      paid: allClaims.filter((c) => c.status === "paid").length,
    }),
    [allClaims]
  );

  const stats = useMemo(() => {
    const thisMonth = dayjs().format("YYYY-MM");
    const claimedThisMonth = allClaims.filter((c) => dayjs(c.expenseDate).format("YYYY-MM") === thisMonth);
    const awaitingApproval = allClaims.filter((c) => c.status === "pending");
    const approvedUnpaid = allClaims.filter((c) => c.status === "approved");
    const breaches = allClaims.filter((c) => c.isPolicyBreach).length;
    const sum = (list: ExpenseClaim[]) => list.reduce((acc, c) => acc + c.amount, 0);

    // A fixed mid-month payout cycle, not a stored setting anywhere yet -
    // there's no real payout-run feature in FieldForce, so this is only
    // the date "approved, unpaid" claims would next be picked up if that
    // cycle is the 15th of every month, the same framing the reference uses.
    const today = dayjs();
    const nextPayout = today.date() <= 15 ? today.date(15) : today.add(1, "month").date(15);

    return {
      claimedThisMonth: { amount: sum(claimedThisMonth), count: claimedThisMonth.length },
      awaitingApproval: { amount: sum(awaitingApproval), count: awaitingApproval.length },
      approvedUnpaid: { amount: sum(approvedUnpaid), count: approvedUnpaid.length, nextPayoutLabel: nextPayout.format("D MMM") },
      breaches,
    };
  }, [allClaims]);

  const filteredClaims = useMemo(
    () => (statusFilter === "all" ? allClaims : allClaims.filter((c) => c.status === statusFilter)),
    [allClaims, statusFilter]
  );

  // Paged outside antd Table - an always-visible footer below a bounded,
  // internally-scrolling row area. Also snaps back to the last page that
  // still has rows when deciding a claim shrinks the filtered list.
  const pager = usePagination("expenses", 20, filteredClaims.length);

  const handleDecision = async (id: string, decision: "approved" | "rejected") => {
    setActing({ id, action: decision });
    try {
      await expenseApi.decideExpenseClaim(id, decision);
      message.success(`Claim ${decision}`);
      load();
    } catch (err) {
      message.error(errorMessageFrom(err, "Failed to record decision"));
    } finally {
      setActing(null);
    }
  };

  const handleMarkPaid = async (id: string) => {
    setActing({ id, action: "paid" });
    try {
      await expenseApi.markClaimPaid(id);
      message.success("Claim marked as paid");
      load();
    } catch (err) {
      message.error(errorMessageFrom(err, "Failed to mark claim paid"));
    } finally {
      setActing(null);
    }
  };

  const handleDownloadReceipt = async (claim: ExpenseClaim) => {
    try {
      // Must be the real filename (with its real extension) - an
      // extension-less synthetic name made the OS/Notepad render the
      // downloaded binary as garbage text instead of opening it properly.
      await expenseApi.downloadReceipt(claim.id, claim.receiptOriginalFilename ?? `EXP-${claim.claimNumber}`);
    } catch {
      message.error("Failed to download receipt");
    }
  };

  const STATUS_TABS: { key: StatusFilter; label: string; count: number }[] = [
    { key: "all", label: "All claims", count: counts.all },
    { key: "pending", label: "Pending", count: counts.pending },
    { key: "approved", label: "Approved", count: counts.approved },
    { key: "rejected", label: "Rejected", count: counts.rejected },
    { key: "paid", label: "Paid", count: counts.paid },
  ];

  return (
    <div className="page-fill-height" style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 8, flexShrink: 0 }}>
        <div>
          <Title level={3} style={{ margin: 0, letterSpacing: -0.3, color: appTokens.textPrimary }}>
            Expenses
          </Title>
          <Text style={{ color: appTokens.textSecondary, fontSize: 13.5 }}>Field claims, policy limits and approval by the reporting manager</Text>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Button icon={<InfoCircleOutlined />} onClick={() => setPolicyDrawerOpen(true)}>
            Expense types &amp; policy
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setNewClaimOpen(true)}>
            New expense claim
          </Button>
        </div>
      </div>

      <div style={{ marginBottom: 16, flexShrink: 0 }}>
        <StatsRow
          stats={[
            {
              label: "Claimed this month",
              value: formatCompactCurrency(stats.claimedThisMonth.amount),
              subtitle: `${stats.claimedThisMonth.count} claim${stats.claimedThisMonth.count === 1 ? "" : "s"}`,
            },
            {
              label: "Awaiting approval",
              value: formatCompactCurrency(stats.awaitingApproval.amount),
              subtitle: `${stats.awaitingApproval.count} claim${stats.awaitingApproval.count === 1 ? "" : "s"}`,
              valueColor: stats.awaitingApproval.count > 0 ? appTokens.warning : undefined,
            },
            {
              label: "Approved, unpaid",
              value: formatCompactCurrency(stats.approvedUnpaid.amount),
              subtitle: `payout ${stats.approvedUnpaid.nextPayoutLabel}`,
            },
            {
              label: "Policy breaches",
              value: String(stats.breaches),
              subtitle: "over limit",
              valueColor: stats.breaches > 0 ? appTokens.danger : undefined,
            },
          ]}
        />
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap", flexShrink: 0 }}>
        {STATUS_TABS.map((tab) => {
          const active = statusFilter === tab.key;
          return (
            <Button
              key={tab.key}
              size="small"
              shape="round"
              onClick={() => {
                setStatusFilter(tab.key);
                pager.setPage(1);
              }}
              style={{
                background: appTokens.surface,
                borderWidth: active ? 1.5 : 1,
                borderColor: active ? appTokens.primary : appTokens.border,
                color: active ? appTokens.primary : appTokens.textSecondary,
                fontWeight: active ? 600 : 500,
              }}
            >
              {tab.label} {tab.count}
            </Button>
          );
        })}
      </div>

      <div
        style={{
          border: `1px solid ${appTokens.border}`,
          borderRadius: appTokens.radius,
          background: appTokens.surface,
          boxShadow: appTokens.shadowXs,
          overflow: "hidden",
          // Doesn't stretch to fill the page while there's nothing to list -
          // an empty state followed by a tall blank card read as broken.
          flex: !loading && filteredClaims.length === 0 ? "0 0 auto" : 1,
          minHeight: !loading && filteredClaims.length === 0 ? undefined : 260,
          display: "flex",
          flexDirection: "column",
        }}
      >
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
      <Table<ExpenseClaim>
        className="thin-scroll-table"
        size="small"
        rowKey="id"
        loading={loading}
        dataSource={pager.slice(filteredClaims)}
        pagination={false}
        // Scrolls sideways on a narrow screen instead of overflowing the card.
        scroll={{ x: 860 }}
        onRow={(c) => ({ className: "table-row-hover", onClick: () => setViewing(c), style: { cursor: "pointer" } })}
        locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No expense claims yet" /> }}
        columns={[
          {
            title: "Claim",
            key: "claim",
            render: (_, c) => (
              <div style={{ display: "flex", alignItems: "center", gap: 8, overflow: "hidden" }}>
                <Avatar size={26} style={{ background: avatarGradient(c.userName ?? "?"), fontSize: 11, fontWeight: 600, flexShrink: 0 }}>
                  {initials(c.userName ?? "?")}
                </Avatar>
                <div style={{ minWidth: 0, overflow: "hidden" }}>
                  <Text
                    strong
                    style={{ fontSize: 13, display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
                    title={c.title}
                  >
                    {c.title}
                  </Text>
                  <Text style={{ fontSize: 11, color: appTokens.textTertiary, whiteSpace: "nowrap" }}>
                    {c.userName ?? user?.name} · EXP-{c.claimNumber}
                  </Text>
                </div>
              </div>
            ),
          },
          {
            title: "Type",
            key: "type",
            render: (_, c) => {
              const type = types.find((t) => t.key === c.expenseTypeKey);
              const color = type?.color ?? appTokens.textSecondary;
              return (
                <Tag style={{ color, background: `${color}17`, border: "none", display: "inline-flex", alignItems: "center", gap: 4 }}>
                  {EXPENSE_TYPE_ICON[c.expenseTypeKey]} {type?.label ?? c.expenseTypeKey}
                </Tag>
              );
            },
          },
          {
            title: "Linked to",
            key: "linkedTo",
            render: (_, c) => {
              const label = c.linkedOpportunityLabel ?? c.linkedLeadLabel;
              return label ? (
                <Text style={{ fontSize: 12.5, color: appTokens.primary, fontWeight: 500 }}>{label}</Text>
              ) : (
                <Text style={{ color: appTokens.textTertiary }}>-</Text>
              );
            },
          },
          { title: "Date", key: "date", render: (_, c) => formatExpenseDate(c.expenseDate) },
          {
            title: "Amount",
            key: "amount",
            render: (_, c) => (
              <Text strong style={{ color: c.isPolicyBreach ? appTokens.danger : appTokens.textPrimary }}>
                {formatExactCurrency(c.amount)}
              </Text>
            ),
          },
          { title: "Approver", key: "approver", render: (_, c) => c.approverName ?? (c.status === "pending" ? "Any Admin" : "-") },
          {
            title: "Status",
            key: "status",
            render: (_, c) => (
              <Tag style={{ color: STATUS_COLOR[c.status], background: `${STATUS_COLOR[c.status]}17`, border: "none", fontWeight: 600 }}>
                {c.status[0].toUpperCase() + c.status.slice(1)}
              </Tag>
            ),
          },
          {
            title: "",
            key: "actions",
            render: (_, c) => {
              const isMyDecision =
                canApprove &&
                c.status === "pending" &&
                ((c.approverId === user?.id && c.approverDecision === null) ||
                  // No reporting manager - any Admin (other than the claimant) can decide it.
                  (c.approverId === null && user?.role === "admin" && c.userId !== user?.id && c.approverDecision === null) ||
                  (c.secondApproverId === user?.id && c.approverDecision === "approved" && c.secondApproverDecision === null));
              return (
                <div style={{ display: "flex", gap: 6, alignItems: "center" }} onClick={(e) => e.stopPropagation()}>
                  {c.hasReceipt && (
                    <Button size="small" type="link" onClick={() => handleDownloadReceipt(c)}>
                      Receipt
                    </Button>
                  )}
                  {isMyDecision && (
                    <>
                      <Button
                        size="small"
                        type="primary"
                        loading={acting?.id === c.id && acting.action === "approved"}
                        disabled={acting?.id === c.id && acting.action !== "approved"}
                        onClick={() => handleDecision(c.id, "approved")}
                      >
                        Approve
                      </Button>
                      <Button
                        size="small"
                        danger
                        loading={acting?.id === c.id && acting.action === "rejected"}
                        disabled={acting?.id === c.id && acting.action !== "rejected"}
                        onClick={() => handleDecision(c.id, "rejected")}
                      >
                        Reject
                      </Button>
                    </>
                  )}
                  {canMarkPaid && c.status === "approved" && (
                    <Button size="small" type="link" loading={acting?.id === c.id && acting.action === "paid"} onClick={() => handleMarkPaid(c.id)}>
                      Mark paid
                    </Button>
                  )}
                </div>
              );
            },
          },
        ]}
      />
      </div>

      {filteredClaims.length > 0 && (
        <div style={{ padding: "12px 16px", flexShrink: 0, borderTop: `1px solid ${appTokens.borderLight}` }}>
          <ListPagination {...pager.props(filteredClaims.length)} />
        </div>
      )}
      </div>

      {viewing && (
        <RequestDetailsModal
          open
          onClose={() => setViewing(null)}
          title={`EXP-${viewing.claimNumber} - ${viewing.title}`}
          status={
            <Tag style={{ color: STATUS_COLOR[viewing.status], background: `${STATUS_COLOR[viewing.status]}17`, border: "none", fontWeight: 600, margin: 0 }}>
              {viewing.status[0].toUpperCase() + viewing.status.slice(1)}
            </Tag>
          }
          fields={[
            { label: "Person", value: viewing.userName ?? "-" },
            { label: "Type", value: types.find((t) => t.key === viewing.expenseTypeKey)?.label ?? viewing.expenseTypeKey },
            { label: "Date", value: formatExpenseDate(viewing.expenseDate) },
            {
              label: "Amount",
              value: (
                <Text strong style={{ color: viewing.isPolicyBreach ? appTokens.danger : undefined }}>
                  {formatExactCurrency(viewing.amount)}
                  {viewing.isPolicyBreach && viewing.policyLimitAtSubmission !== null ? ` (over the ${formatExactCurrency(viewing.policyLimitAtSubmission)} limit)` : ""}
                </Text>
              ),
            },
            { label: "Linked to", value: viewing.linkedOpportunityLabel ?? viewing.linkedLeadLabel ?? "-" },
            { label: "Receipt", value: viewing.hasReceipt ? viewing.receiptOriginalFilename ?? "Attached" : "None" },
            ...(viewing.decisionNote ? [{ label: "Decision note", value: viewing.decisionNote }] : []),
            ...(viewing.paidAt ? [{ label: "Paid", value: dayjs(viewing.paidAt).format("D MMM YYYY") }] : []),
            { label: "Submitted", value: dayjs(viewing.createdAt).format("D MMM YYYY, h:mm A") },
          ]}
          steps={expenseSteps(viewing)}
        />
      )}

      <Drawer
        title="Expense types & policy"
        open={policyDrawerOpen}
        onClose={() => setPolicyDrawerOpen(false)}
        size={420}
      >
        <Text style={{ fontSize: 12.5, color: appTokens.textTertiary, display: "block", marginBottom: 16 }}>
          Limits are checked when the claim is filed
        </Text>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {types.map((t) => (
            <div key={t.key} style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: appTokens.radiusSm,
                  background: `${t.color}17`,
                  color: t.color,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {EXPENSE_TYPE_ICON[t.key]}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <Text strong style={{ fontSize: 13, display: "block" }}>
                  {t.label}
                </Text>
                <Text style={{ fontSize: 12, color: appTokens.textTertiary }}>{t.policyNote}</Text>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <Text strong style={{ fontSize: 13, display: "block" }}>
                  ₹{t.limitAmount.toLocaleString("en-IN")} {limitUnitSuffix(t.limitUnit)}
                </Text>
                <Text style={{ fontSize: 11, color: t.receiptRequired ? appTokens.warning : appTokens.textTertiary }}>
                  {t.receiptRequired ? "Receipt required" : "No receipt"}
                </Text>
              </div>
            </div>
          ))}
        </div>
      </Drawer>

      <NewExpenseClaimModal
        open={newClaimOpen}
        onClose={() => setNewClaimOpen(false)}
        onSubmitted={() => {
          setNewClaimOpen(false);
          load();
        }}
        types={types}
        managerName={user?.managerName ?? null}
        initialTypeKey={prefillTypeKey}
      />
    </div>
  );
}

function expenseSteps(c: ExpenseClaim): ApprovalStep[] {
  const steps: ApprovalStep[] = [
    { label: "Reporting manager", person: c.approverName ?? (c.approverId ? null : "Any Admin"), decision: c.approverDecision, decidedAt: c.approverDecidedAt },
  ];
  if (c.secondApproverId) {
    steps.push({ label: "Second approval", person: c.secondApproverName, decision: c.secondApproverDecision, decidedAt: c.secondApproverDecidedAt });
  }
  return steps;
}
