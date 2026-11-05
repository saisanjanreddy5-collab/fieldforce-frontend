import { useEffect, useState } from "react";
import { App, Button, Empty, Input, Modal, Pagination, Popconfirm, Spin, Typography } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import * as opportunityApi from "../../api/opportunity-api";
import type { Opportunity } from "../../types/opportunity";
import { appTokens } from "../../utils/design-system";
import { formatCurrency } from "../../utils/lead-format";

const { Text } = Typography;
const PAGE_SIZE = 20;

interface ArchivedOpportunitiesModalProps {
  open: boolean;
  onClose: () => void;
  onRestored: () => void;
}

// Same standalone-view reasoning as ArchivedLeadsModal - archived
// opportunities are a find-it-and-bring-it-back list, not the board/list/
// forecast views' own real complexity.
export function ArchivedOpportunitiesModal({ open, onClose, onRestored }: ArchivedOpportunitiesModalProps) {
  const { message } = App.useApp();
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const load = (targetPage: number) => {
    setLoading(true);
    opportunityApi
      .listOpportunities({ archived: true, search: search.trim() || undefined, page: targetPage, limit: PAGE_SIZE })
      .then((result) => {
        setOpportunities(result.opportunities);
        setTotal(result.total);
        setPage(targetPage);
      })
      .catch(() => message.error("Failed to load archived opportunities"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!open) return;
    setSearch("");
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handle = setTimeout(() => load(1), 300);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const handleRestore = async (opportunity: Opportunity) => {
    setRestoringId(opportunity.id);
    try {
      await opportunityApi.restoreOpportunity(opportunity.id);
      message.success(`${opportunity.name ?? opportunity.leadFullName ?? "Opportunity"} restored`);
      load(page);
      onRestored();
    } catch {
      message.error("Failed to restore this opportunity");
    } finally {
      setRestoringId(null);
    }
  };

  return (
    <Modal title="Archived opportunities" open={open} onCancel={onClose} footer={null} width={640}>
      <Input
        prefix={<SearchOutlined style={{ color: appTokens.textTertiary }} />}
        placeholder="Search archived opportunities by name or lead"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ marginBottom: 12 }}
        allowClear
      />

      {loading ? (
        <div style={{ textAlign: "center", padding: 32 }}>
          <Spin />
        </div>
      ) : opportunities.length === 0 ? (
        <Empty description="No archived opportunities" style={{ padding: 24 }} />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {opportunities.map((opp) => (
            <div
              key={opp.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "10px 12px",
                border: `1px solid ${appTokens.border}`,
                borderRadius: appTokens.radiusSm,
                gap: 10,
              }}
            >
              <div style={{ minWidth: 0 }}>
                <Text strong style={{ display: "block" }}>
                  {opp.name ?? opp.leadFullName ?? "Untitled opportunity"}
                </Text>
                <Text style={{ fontSize: 12, color: appTokens.textTertiary }}>
                  {[opp.leadFullName, opp.value ? formatCurrency(opp.value) : null].filter(Boolean).join(" · ") || "No details"}
                </Text>
              </div>
              <Popconfirm title="Restore this opportunity?" onConfirm={() => handleRestore(opp)}>
                <Button size="small" type="primary" loading={restoringId === opp.id}>
                  Restore
                </Button>
              </Popconfirm>
            </div>
          ))}
        </div>
      )}

      {total > PAGE_SIZE && (
        <div style={{ display: "flex", justifyContent: "center", marginTop: 16 }}>
          <Pagination size="small" current={page} pageSize={PAGE_SIZE} total={total} onChange={load} showSizeChanger={false} />
        </div>
      )}
    </Modal>
  );
}
