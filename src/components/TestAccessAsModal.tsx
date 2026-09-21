import { useState } from "react";
import { Empty, List, Modal, Select, Tag, Typography, message } from "antd";
import * as testAccessApi from "../api/test-access-api";
import type { TestAccessSummary } from "../types/test-access";
import type { TeamMember } from "../types/user";
import { formatCompactCurrency } from "../utils/lead-format";

const { Text } = Typography;

interface TestAccessAsModalProps {
  open: boolean;
  onClose: () => void;
  users: TeamMember[];
}

// Read-only simulation, never an actual impersonation/session switch - it
// only shows what the real subtree-based visibility already resolves to
// for the selected person today, computed live by test-access-service.ts.
export function TestAccessAsModal({ open, onClose, users }: TestAccessAsModalProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [summary, setSummary] = useState<TestAccessSummary | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSelect = (userId: string) => {
    setSelectedId(userId);
    setLoading(true);
    testAccessApi
      .getTestAccessSummary(userId)
      .then(setSummary)
      .catch(() => message.error("Failed to load access summary"))
      .finally(() => setLoading(false));
  };

  const handleClose = () => {
    setSelectedId(null);
    setSummary(null);
    onClose();
  };

  return (
    <Modal title="Test access as..." open={open} onCancel={handleClose} footer={null} width={520}>
      <Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 12 }}>
        See exactly what a person can reach today, computed live - nothing here signs in as them.
      </Text>
      <Select
        style={{ width: "100%", marginBottom: 16 }}
        placeholder="Select a person"
        showSearch
        optionFilterProp="label"
        value={selectedId}
        onChange={handleSelect}
        loading={loading}
        options={users.filter((u) => u.isActive).map((u) => ({ value: u.id, label: `${u.name} (${u.role})` }))}
      />

      {!summary ? (
        <Empty description="Pick a person to see their scope" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <div>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 16 }}>
            <div>
              <Text type="secondary" style={{ fontSize: 11 }}>
                Level
              </Text>
              <div>{summary.levelName ?? "-"}</div>
            </div>
            <div>
              <Text type="secondary" style={{ fontSize: 11 }}>
                Territory
              </Text>
              <div>{summary.territory ?? "-"}</div>
            </div>
            <div>
              <Text type="secondary" style={{ fontSize: 11 }}>
                Reports to
              </Text>
              <div>{summary.managerName ?? "Top of org"}</div>
            </div>
            <div>
              <Text type="secondary" style={{ fontSize: 11 }}>
                Direct reports
              </Text>
              <div>{summary.directReports.length}</div>
            </div>
            <div>
              <Text type="secondary" style={{ fontSize: 11 }}>
                Approves up to
              </Text>
              <div>
                {summary.approvesUpTo === null
                  ? "-"
                  : typeof summary.approvesUpTo === "number"
                    ? formatCompactCurrency(summary.approvesUpTo)
                    : summary.approvesUpTo}
              </div>
            </div>
          </div>

          <Text strong style={{ display: "block", marginBottom: 8 }}>
            What they can reach
          </Text>
          <List
            size="small"
            bordered
            dataSource={[
              { label: "Own leads", detail: `${summary.ownLeadCount} records`, tag: "Full" },
              {
                label: "Team records below",
                detail: `${summary.teamPeopleBelow} people, ${summary.teamLeadCountBelow} records`,
                tag: "Full",
              },
              {
                label: "Peers",
                detail: summary.peers.length === 0 ? "None" : summary.peers.map((p) => p.name).join(", "),
                tag: "Hidden",
              },
              { label: "Everything else", detail: "Outside their reporting tree", tag: "Hidden" },
            ]}
            renderItem={(item) => (
              <List.Item extra={<Tag color={item.tag === "Full" ? "green" : "default"}>{item.tag}</Tag>}>
                <List.Item.Meta title={item.label} description={item.detail} />
              </List.Item>
            )}
          />
        </div>
      )}
    </Modal>
  );
}
