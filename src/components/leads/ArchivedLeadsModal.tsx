import { useEffect, useState } from "react";
import { App, Button, Empty, Input, Modal, Pagination, Popconfirm, Spin, Typography } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import * as leadApi from "../../api/lead-api";
import type { Lead } from "../../types/lead";
import { appTokens } from "../../utils/design-system";
import { errorMessageFrom } from "../../utils/api-error";

const { Text } = Typography;
const PAGE_SIZE = 20;

interface ArchivedLeadsModalProps {
  open: boolean;
  onClose: () => void;
  // Lets the main Leads list (counts, quick filters) catch up once something
  // comes back - restoring here doesn't touch that page's own state directly.
  onRestored: () => void;
}

// A standalone view, not wired into LeadsPage's own list/detail/selection
// machinery (keyboard nav, deep-linking, split view) - archived leads are a
// fundamentally different, much simpler thing to look at (find it, bring it
// back), and reusing that page's real complexity for it would risk breaking
// the actual day-to-day Leads workflow for very little benefit.
export function ArchivedLeadsModal({ open, onClose, onRestored }: ArchivedLeadsModalProps) {
  const { message } = App.useApp();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const load = (targetPage: number) => {
    setLoading(true);
    leadApi
      .listLeads({ archived: true, search: search.trim() || undefined, page: targetPage, limit: PAGE_SIZE })
      .then((result) => {
        setLeads(result.leads);
        setTotal(result.total);
        setPage(targetPage);
      })
      .catch(() => message.error("Failed to load archived leads"))
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

  const handleRestore = async (lead: Lead) => {
    setRestoringId(lead.id);
    try {
      await leadApi.restoreLead(lead.id);
      message.success(`${lead.fullName} restored`);
      load(page);
      onRestored();
    } catch (err) {
      message.error(errorMessageFrom(err, "Failed to restore this lead"));
    } finally {
      setRestoringId(null);
    }
  };

  return (
    <Modal title="Archived leads" open={open} onCancel={onClose} footer={null} width={640}>
      <Input
        prefix={<SearchOutlined style={{ color: appTokens.textTertiary }} />}
        placeholder="Search archived leads by name, company, or phone"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ marginBottom: 12 }}
        allowClear
      />

      {loading ? (
        <div style={{ textAlign: "center", padding: 32 }}>
          <Spin />
        </div>
      ) : leads.length === 0 ? (
        <Empty description="No archived leads" style={{ padding: 24 }} />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {leads.map((lead) => (
            <div
              key={lead.id}
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
                  {lead.fullName}
                </Text>
                <Text style={{ fontSize: 12, color: appTokens.textTertiary }}>
                  {[lead.companyName, lead.phone].filter(Boolean).join(" · ") || "No contact details"}
                </Text>
              </div>
              <Popconfirm title="Restore this lead?" onConfirm={() => handleRestore(lead)}>
                <Button size="small" type="primary" loading={restoringId === lead.id}>
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
