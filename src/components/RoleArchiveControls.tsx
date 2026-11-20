import { useCallback, useState } from "react";
import { App, Button, Typography } from "antd";
import { InboxOutlined, UndoOutlined } from "@ant-design/icons";
import * as levelApi from "../api/level-api";
import type { Level } from "../types/level";
import { errorMessageFrom } from "../utils/api-error";
import { appTokens } from "../utils/design-system";

const { Text } = Typography;

const peopleLabel = (n: number) => `${n} ${n === 1 ? "person" : "people"}`;

// Archive / restore a role (level) with a clear statement of what happens -
// archiving only stops the role being given to anyone new; the people on it
// and everything they own are never touched. Shared by the Levels & axes and
// Roles & access tabs.
export function useRoleArchive(onChanged: () => void) {
  const { modal, message } = App.useApp();
  const [busyId, setBusyId] = useState<string | null>(null);

  const run = useCallback(
    async (level: Level, action: "archive" | "restore") => {
      setBusyId(level.id);
      try {
        if (action === "archive") await levelApi.archiveLevel(level.id);
        else await levelApi.restoreLevel(level.id);
        message.success(action === "archive" ? `"${level.name}" archived - nothing else changed` : `"${level.name}" restored`);
        onChanged();
      } catch (err) {
        message.error(errorMessageFrom(err, action === "archive" ? "Couldn't archive this role" : "Couldn't restore this role"));
      } finally {
        setBusyId(null);
      }
    },
    [message, onChanged]
  );

  const archive = useCallback(
    (level: Level) =>
      modal.confirm({
        title: `Archive the "${level.name}" role?`,
        okText: "Archive role",
        okButtonProps: { danger: true },
        width: 460,
        content: (
          <ul style={{ paddingLeft: 18, margin: "8px 0 0", display: "flex", flexDirection: "column", gap: 6 }}>
            <li>
              {level.currentHeadcount > 0 ? (
                <>
                  <b>{peopleLabel(level.currentHeadcount)}</b> on this role keep their access, and everything they own - leads,
                  customers, opportunities, activities and history - stays exactly as it is.
                </>
              ) : (
                <>Nobody is on this role right now.</>
              )}
            </li>
            <li>Nobody new can be given this role while it's archived.</li>
            <li>You can restore it at any time from Archived roles.</li>
          </ul>
        ),
        onOk: () => run(level, "archive"),
      }),
    [modal, run]
  );

  const restore = useCallback(
    (level: Level) =>
      modal.confirm({
        title: `Restore the "${level.name}" role?`,
        content: "It can be given to people again. Nothing else changes.",
        okText: "Restore role",
        onOk: () => run(level, "restore"),
      }),
    [modal, run]
  );

  return { archive, restore, busyId };
}

// The archived roles, each with Restore - shown under the active list.
export function ArchivedRolesList({
  levels,
  canManage,
  busyId,
  onRestore,
}: {
  levels: Level[];
  canManage: boolean;
  busyId: string | null;
  onRestore: (level: Level) => void;
}) {
  if (levels.length === 0) return null;
  return (
    <div style={{ marginTop: 16 }}>
      <Text strong style={{ fontSize: 13 }}>
        Archived roles ({levels.length})
      </Text>
      <Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 6 }}>
        Not given to anyone new. People already on them keep their access and all their data.
      </Text>
      {levels.map((level) => (
        <div
          key={level.id}
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 8,
            padding: "8px 10px",
            border: `1px dashed ${appTokens.border}`,
            borderRadius: appTokens.radiusSm,
            marginBottom: 6,
            background: appTokens.surfaceMuted,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <Text style={{ color: appTokens.textSecondary }}>
              <InboxOutlined style={{ marginRight: 6 }} />
              {level.name}
            </Text>
            <Text type="secondary" style={{ fontSize: 12, display: "block" }}>
              {peopleLabel(level.currentHeadcount)} still on it
              {level.archivedAt ? ` · archived ${new Date(level.archivedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}` : ""}
            </Text>
          </div>
          {canManage && (
            <Button size="small" icon={<UndoOutlined />} loading={busyId === level.id} onClick={() => onRestore(level)}>
              Restore
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}
