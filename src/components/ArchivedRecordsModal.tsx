import { useEffect, useState } from "react";
import { App, Button, Empty, Input, Modal, Popconfirm, Spin, Typography } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import { appTokens } from "../utils/design-system";
import { useLatestRequest } from "../hooks/use-latest-request";
import { usePagination } from "../hooks/use-pagination";
import { ListPagination } from "./ListPagination";

const { Text } = Typography;

export interface ArchivedRecordsModalProps<T extends { id: string }> {
  open: boolean;
  onClose: () => void;
  // Lets the page behind this modal (its list, counts, quick filters) catch
  // up once something comes back - restoring here doesn't touch that page's
  // own state directly.
  onRestored: () => void;
  title: string;
  /** Singular noun for the restore confirmation ("Restore this lead?"). */
  noun: string;
  searchPlaceholder: string;
  emptyText: string;
  loadErrorText: string;
  /** Remembers this modal's rows-per-page choice (see usePagination). */
  paginationKey: string;
  fetchPage: (params: { search: string | undefined; page: number; limit: number }) => Promise<{ items: T[]; total: number }>;
  restore: (record: T) => Promise<void>;
  restoredText: (record: T) => string;
  restoreErrorText: (err: unknown) => string;
  primaryText: (record: T) => string;
  secondaryText: (record: T) => string;
}

// A standalone find-it-and-bring-it-back list, deliberately not wired into
// the owning page's own list/detail/selection machinery (keyboard nav,
// deep-linking, split view, board/forecast views) - archived records are a
// much simpler thing to look at, and reusing that page's real complexity for
// it would risk breaking the day-to-day workflow for very little benefit.
export function ArchivedRecordsModal<T extends { id: string }>({
  open,
  onClose,
  onRestored,
  title,
  noun,
  searchPlaceholder,
  emptyText,
  loadErrorText,
  paginationKey,
  fetchPage,
  restore,
  restoredText,
  restoreErrorText,
  primaryText,
  secondaryText,
}: ArchivedRecordsModalProps<T>) {
  const { message } = App.useApp();
  const [records, setRecords] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const pager = usePagination(paginationKey, 20);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  // Only the newest load may update the list (typing quickly, reopening).
  const latest = useLatestRequest();
  const load = (targetPage: number, searchText = search, pageSize = pager.pageSize) => {
    const token = latest.start();
    setLoading(true);
    fetchPage({ search: searchText.trim() || undefined, page: targetPage, limit: pageSize })
      .then((result) => {
        if (!latest.isCurrent(token)) return;
        setRecords(result.items);
        setTotal(result.total);
        pager.setPage(targetPage);
      })
      .catch(() => message.error(loadErrorText))
      .finally(() => latest.isCurrent(token) && setLoading(false));
  };

  // A new rows-per-page is shown (and remembered) straight away and reloads
  // page 1; a plain page flip only moves once its rows have arrived.
  const handlePageChange = (targetPage: number, pageSize: number) => {
    if (pageSize !== pager.pageSize) pager.onChange(targetPage, pageSize);
    load(targetPage, search, pageSize);
  };

  useEffect(() => {
    if (!open) return;
    setSearch("");
    load(1, "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handle = setTimeout(() => load(1), 300);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const handleRestore = async (record: T) => {
    setRestoringId(record.id);
    try {
      await restore(record);
      message.success(restoredText(record));
      load(pager.page);
      onRestored();
    } catch (err) {
      message.error(restoreErrorText(err));
    } finally {
      setRestoringId(null);
    }
  };

  return (
    <Modal title={title} open={open} onCancel={onClose} footer={null} width={640}>
      <Input
        prefix={<SearchOutlined style={{ color: appTokens.textTertiary }} />}
        placeholder={searchPlaceholder}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ marginBottom: 12 }}
        allowClear
      />

      {loading ? (
        <div style={{ textAlign: "center", padding: 32 }}>
          <Spin />
        </div>
      ) : records.length === 0 ? (
        <Empty description={emptyText} style={{ padding: 24 }} />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {records.map((record) => (
            <div
              key={record.id}
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
                  {primaryText(record)}
                </Text>
                <Text style={{ fontSize: 12, color: appTokens.textTertiary }}>{secondaryText(record)}</Text>
              </div>
              <Popconfirm title={`Restore this ${noun}?`} onConfirm={() => handleRestore(record)}>
                <Button size="small" type="primary" loading={restoringId === record.id}>
                  Restore
                </Button>
              </Popconfirm>
            </div>
          ))}
        </div>
      )}

      {total > 0 && (
        <div style={{ paddingTop: 12, width: "100%" }}>
          <ListPagination {...pager.props(total)} onChange={handlePageChange} />
        </div>
      )}
    </Modal>
  );
}
