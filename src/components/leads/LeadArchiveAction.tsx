import { useState } from "react";
import { App, Button, Popconfirm } from "antd";
import { InboxOutlined } from "@ant-design/icons";
import * as leadApi from "../../api/lead-api";
import type { Lead } from "../../types/lead";
import { useHasPermission } from "../../hooks/use-permission";
import { errorMessageFrom } from "../../utils/api-error";

interface LeadArchiveActionProps {
  lead: Lead;
  onChanged: () => void;
}

// Archives this lead (never a real delete - see leadApi.archiveLead, which
// just hits the existing is_deleted-backed DELETE /leads/:id). This button
// never existed in the UI before even though the backend/permission already
// did - the Leads page's own "Show archived" toggle is where it goes to be
// seen again and restored.
export function LeadArchiveAction({ lead, onChanged }: LeadArchiveActionProps) {
  const { message } = App.useApp();
  const hasPermission = useHasPermission();
  const [archiving, setArchiving] = useState(false);

  if (!hasPermission("leads.delete") || !lead.inOwnerScope) return null;

  const handleArchive = async () => {
    setArchiving(true);
    try {
      await leadApi.archiveLead(lead.id);
      message.success("Lead archived - find it again under \"Show archived\" on the Leads page");
      onChanged();
    } catch (err) {
      message.error(errorMessageFrom(err, "Failed to archive this lead"));
    } finally {
      setArchiving(false);
    }
  };

  return (
    <Popconfirm
      title="Archive this lead?"
      description="It will be hidden from your Leads list but never deleted - you can restore it anytime."
      onConfirm={handleArchive}
      okText="Archive"
    >
      <Button size="small" danger icon={<InboxOutlined />} loading={archiving}>
        Archive
      </Button>
    </Popconfirm>
  );
}
