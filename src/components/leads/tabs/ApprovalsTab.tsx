import { Alert, Progress, Tag, Typography } from "antd";
import { CheckCircleFilled, ExclamationCircleFilled, LockOutlined } from "@ant-design/icons";

const { Title, Text } = Typography;

// Skeleton UI only - no approval-workflow backend exists yet. Structure
// matches what a real stage-gate engine would need (named approver role,
// per-item gate checklist, lock reason) so this can be wired to real data
// without a redesign once that engine exists.
interface GateItem {
  label: string;
  value?: string;
  met: boolean;
}

interface ApprovalStage {
  stage: number;
  title: string;
  approverRole: string;
  approverName: string;
  status: "approved" | "waiting" | "gate_not_met";
  approvedOn?: string;
  gateLabel: string;
  items: GateItem[];
  lockReason?: string;
}

const MOCK_STAGES: ApprovalStage[] = [
  {
    stage: 1,
    title: "Field qualification",
    approverRole: "Salesperson",
    approverName: "—",
    status: "approved",
    approvedOn: "8 Sep",
    gateLabel: "Site visit and catchment",
    items: [
      { label: "Site visit completed", value: "8 Sep 2026", met: true },
      { label: "Carpet area recorded", value: "620 sq ft", met: true },
      { label: "Catchment check", value: "cleared", met: true },
    ],
  },
  {
    stage: 2,
    title: "KYC verification",
    approverRole: "Ops",
    approverName: "—",
    status: "approved",
    approvedOn: "9 Sep",
    gateLabel: "KYC complete",
    items: [
      { label: "PAN verified", value: "verified", met: true },
      { label: "Aadhaar / identity proof", value: "matched", met: true },
      { label: "Address proof", value: "electricity bill", met: true },
      { label: "Bank account validated", value: "penny drop ok", met: true },
      { label: "GST certificate", value: "verified", met: true },
      { label: "DPDP consent", value: "on file", met: true },
    ],
  },
  {
    stage: 3,
    title: "Document check",
    approverRole: "Ops",
    approverName: "—",
    status: "gate_not_met",
    gateLabel: "All documents uploaded and verified",
    items: [
      { label: "Shop agreement", value: "signed", met: true },
      { label: "Site photographs", value: "4 images", met: true },
      { label: "Drug licence", value: "on file", met: true },
      { label: "FSSAI certificate", value: "missing", met: false },
      { label: "Cancelled cheque", value: "uploaded", met: true },
      { label: "Owner photograph", value: "missing", met: false },
    ],
    lockReason: "Locked until FSSAI certificate and Owner photograph are cleared.",
  },
  {
    stage: 4,
    title: "Commercials",
    approverRole: "Sales Manager",
    approverName: "—",
    status: "waiting",
    gateLabel: "Terms and credit set",
    items: [
      { label: "Margin slab agreed", value: "Slab B", met: true },
      { label: "Security deposit", value: "received", met: true },
      { label: "Credit category", value: "finance pending", met: false },
      { label: "Target go-live", value: "set", met: true },
    ],
  },
  {
    stage: 5,
    title: "Final approval & push",
    approverRole: "Regional Head",
    approverName: "—",
    status: "waiting",
    gateLabel: "Every earlier stage approved",
    items: [
      { label: "Stage 1-4 approved", value: "pending stage 3", met: false },
      { label: "Onboarding payload ready", value: "awaiting docs", met: false },
    ],
  },
];

function statusTag(status: ApprovalStage["status"]) {
  if (status === "approved") return <Tag color="success">Approved</Tag>;
  if (status === "gate_not_met") return <Tag color="warning">Gate not met</Tag>;
  return <Tag>Waiting</Tag>;
}

export function ApprovalsTab() {
  const clearedCount = MOCK_STAGES.filter((s) => s.status === "approved").length;
  const blockedStage = MOCK_STAGES.find((s) => s.lockReason);

  return (
    <div>
      <Alert
        type="warning"
        showIcon
        style={{ marginBottom: 16 }}
        title="This is a UI preview - no approval workflow engine is wired up yet"
        description="Stage data below is static. Once the real stage-gate backend exists, this screen is ready to be connected without a redesign."
      />

      {blockedStage && (
        <Alert
          type="warning"
          showIcon
          icon={<LockOutlined />}
          style={{ marginBottom: 16 }}
          title={`Blocked at stage ${blockedStage.stage}`}
          description={blockedStage.lockReason}
        />
      )}

      <div style={{ marginBottom: 16 }}>
        <Text type="secondary">
          {clearedCount} / {MOCK_STAGES.length} stages cleared
        </Text>
        <Progress percent={(clearedCount / MOCK_STAGES.length) * 100} showInfo={false} />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {MOCK_STAGES.map((stage) => (
          <div key={stage.stage} style={{ border: "1px solid #f0f0f0", borderRadius: 8, padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
              <Title level={5} style={{ margin: 0 }}>
                Stage {stage.stage} — {stage.title}
              </Title>
              {statusTag(stage.status)}
            </div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {stage.approverRole} {stage.approvedOn ? `· Approved ${stage.approvedOn}` : "· Waiting"}
            </Text>

            <div style={{ marginTop: 8 }}>
              <Text strong style={{ fontSize: 12, textTransform: "uppercase" }}>
                Gate: {stage.gateLabel} · {stage.items.filter((i) => i.met).length} of {stage.items.length}
              </Text>
              <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 4 }}>
                {stage.items.map((item) => (
                  <div key={item.label} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                    <span>
                      {item.met ? (
                        <CheckCircleFilled style={{ color: "#0ca30c", marginRight: 6 }} />
                      ) : (
                        <ExclamationCircleFilled style={{ color: "#eda100", marginRight: 6 }} />
                      )}
                      {item.label}
                    </span>
                    <Text type="secondary">{item.value}</Text>
                  </div>
                ))}
              </div>
            </div>

            {stage.lockReason && (
              <Alert type="warning" showIcon title={stage.lockReason} style={{ marginTop: 12 }} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
