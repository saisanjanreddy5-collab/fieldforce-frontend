import { useEffect, useMemo, useState } from "react";
import { Avatar, Button, Table, Tag, Typography, message } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { useSearchParams } from "react-router-dom";
import dayjs from "dayjs";
import * as expenseApi from "../api/expense-api";
import type { ExpenseClaim, ExpenseClaimStatus, ExpenseType, ExpenseTypeKey } from "../types/expense";
import { useAuth } from "../context/AuthContext";
import { useHasPermission } from "../hooks/use-permission";
import { appTokens, avatarGradient } from "../utils/design-system";
import { initials, formatCompactCurrency, formatCurrency } from "../utils/lead-format";
import { formatExpenseDate, limitUnitSuffix } from "../utils/expense-format";
import { EXPENSE_TYPE_ICON } from "../utils/expense-icons";
import { errorMessageFrom } from "../utils/api-error";
import { NewExpenseClaimModal } from "../components/expenses/NewExpenseClaimModal";

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

  const [types, setTypes] = useState<ExpenseType[]>([]);
  const [myClaims, setMyClaims] = useState<ExpenseClaim[]>([]);
  const [teamClaims, setTeamClaims] = useState<ExpenseClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [newClaimOpen, setNewClaimOpen] = useState(false);
  const [prefillTypeKey, setPrefillTypeKey] = useState<ExpenseTypeKey | undefined>();
  const [searchParams, setSearchParams] = useSearchParams();

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
    Promise.all([expenseApi.listExpenseTypes(), expenseApi.listMyClaims(), canApprove ? expenseApi.listTeamClaims() : Promise.resolve([])])
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

  const handleDecision = async (id: string, decision: "approved" | "rejected") => {
    try {
      await expenseApi.decideExpenseClaim(id, decision);
      message.success(`Claim ${decision}`);
      load();
    } catch (err) {
      message.error(errorMessageFrom(err, "Failed to record decision"));
    }
  };

  const handleMarkPaid = async (id: string) => {
    try {
      await expenseApi.markClaimPaid(id);
      message.success("Claim marked as paid");
      load();
    } catch (err) {
      message.error(errorMessageFrom(err, "Failed to mark claim paid"));
    }
  };

  const handleDownloadReceipt = async (claim: ExpenseClaim) => {
    try {
      await expenseApi.downloadReceipt(claim.id, `EXP-${claim.claimNumber}`);
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
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 8 }}>
        <div>
          <Title level={3} style={{ margin: 0, letterSpacing: -0.3, color: appTokens.textPrimary }}>
            Expenses
          </Title>
          <Text style={{ color: appTokens.textSecondary, fontSize: 13.5 }}>Field claims, policy limits and approval by the reporting manager</Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setNewClaimOpen(true)}>
          New expense claim
        </Button>
      </div>

      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 16 }}>
        {[
          {
            label: "Claimed this month",
            value: formatCompactCurrency(stats.claimedThisMonth.amount),
            subtitle: `${stats.claimedThisMonth.count} claim${stats.claimedThisMonth.count === 1 ? "" : "s"}`,
            color: appTokens.textPrimary,
          },
          {
            label: "Awaiting approval",
            value: formatCompactCurrency(stats.awaitingApproval.amount),
            subtitle: `${stats.awaitingApproval.count} claim${stats.awaitingApproval.count === 1 ? "" : "s"}`,
            color: stats.awaitingApproval.count > 0 ? appTokens.warning : appTokens.textPrimary,
          },
          {
            label: "Approved, unpaid",
            value: formatCompactCurrency(stats.approvedUnpaid.amount),
            subtitle: `payout ${stats.approvedUnpaid.nextPayoutLabel}`,
            color: appTokens.textPrimary,
          },
          {
            label: "Policy breaches",
            value: String(stats.breaches),
            subtitle: "over limit",
            color: stats.breaches > 0 ? appTokens.danger : appTokens.textPrimary,
          },
        ].map((stat) => (
          <div
            key={stat.label}
            style={{
              flex: "1 1 180px",
              minWidth: 180,
              border: `1px solid ${appTokens.border}`,
              borderRadius: appTokens.radius,
              padding: "14px 16px",
              background: appTokens.surface,
              boxShadow: appTokens.shadowSm,
            }}
          >
            <Text style={{ fontSize: 11.5, fontWeight: 600, color: appTokens.textTertiary, display: "block" }}>{stat.label}</Text>
            <div style={{ fontSize: 26, fontWeight: 700, color: stat.color, letterSpacing: -0.4, lineHeight: 1.25 }}>{stat.value}</div>
            <Text style={{ fontSize: 12, color: appTokens.textTertiary }}>{stat.subtitle}</Text>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
        {STATUS_TABS.map((tab) => {
          const active = statusFilter === tab.key;
          return (
            <Button
              key={tab.key}
              size="small"
              shape="round"
              onClick={() => setStatusFilter(tab.key)}
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

      <Table<ExpenseClaim>
        className="thin-scroll-table"
        size="small"
        rowKey="id"
        loading={loading}
        dataSource={filteredClaims}
        pagination={false}
        onRow={() => ({ className: "table-row-hover" })}
        locale={{ emptyText: "No expense claims yet" }}
        columns={[
          {
            title: "Claim",
            key: "claim",
            render: (_, c) => (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Avatar size={26} style={{ background: avatarGradient(c.userName ?? "?"), fontSize: 11, fontWeight: 600 }}>
                  {initials(c.userName ?? "?")}
                </Avatar>
                <div>
                  <Text strong style={{ fontSize: 13, display: "block" }}>
                    {c.title}
                  </Text>
                  <Text style={{ fontSize: 11, color: appTokens.textTertiary }}>
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
                {formatCurrency(c.amount)}
              </Text>
            ),
          },
          { title: "Approver", key: "approver", render: (_, c) => c.approverName ?? "-" },
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
                  (c.secondApproverId === user?.id && c.approverDecision === "approved" && c.secondApproverDecision === null));
              return (
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  {c.hasReceipt && (
                    <Button size="small" type="link" onClick={() => handleDownloadReceipt(c)}>
                      Receipt
                    </Button>
                  )}
                  {isMyDecision && (
                    <>
                      <Button size="small" type="primary" onClick={() => handleDecision(c.id, "approved")}>
                        Approve
                      </Button>
                      <Button size="small" danger onClick={() => handleDecision(c.id, "rejected")}>
                        Reject
                      </Button>
                    </>
                  )}
                  {canMarkPaid && c.status === "approved" && (
                    <Button size="small" type="link" onClick={() => handleMarkPaid(c.id)}>
                      Mark paid
                    </Button>
                  )}
                </div>
              );
            },
          },
        ]}
      />

      <div
        style={{
          marginTop: 20,
          border: `1px solid ${appTokens.border}`,
          borderRadius: appTokens.radius,
          background: appTokens.surface,
          boxShadow: appTokens.shadowSm,
          padding: 16,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
          <div>
            <Text strong style={{ fontSize: 14 }}>
              Expense types & policy
            </Text>
            <div>
              <Text style={{ fontSize: 12.5, color: appTokens.textTertiary }}>Limits are checked when the claim is filed</Text>
            </div>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
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
      </div>

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
