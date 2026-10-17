import { useState } from "react";
import { App, Button, Popover, Select, Skeleton, Typography } from "antd";
import { isAxiosError } from "axios";
import { SendOutlined } from "@ant-design/icons";
import * as leadApi from "../../api/lead-api";
import { errorMessageFrom } from "../../utils/api-error";

const { Text } = Typography;

interface SendToFieldActionProps {
  leadId: string;
  size?: "small" | "middle";
  onDone: () => void;
}

// A single compact button that handles its own disambiguation - tries the
// obvious case first (exactly one field employee covers this pincode), and
// only opens a small anchored popover (not an inline block that pushes the
// rest of the page down) when the backend reports more than one real match.
// Shared between the Call Center queue (where the agent pushes their own
// Qualified leads) and the Lead detail page's assignment panel (where an
// Admin/Manager can do the same thing for oversight).
export function SendToFieldAction({ leadId, size = "middle", onDone }: SendToFieldActionProps) {
  const { message } = App.useApp();
  const [sending, setSending] = useState(false);
  const [open, setOpen] = useState(false);
  const [candidates, setCandidates] = useState<leadApi.SwapCandidate[]>([]);
  const [chosenId, setChosenId] = useState<string | undefined>(undefined);

  const attempt = async (ownerId?: string) => {
    setSending(true);
    try {
      await leadApi.sendToField(leadId, ownerId);
      message.success("Sent to Field Sales");
      setOpen(false);
      onDone();
    } catch (err) {
      if (isAxiosError<{ errors?: { candidates?: leadApi.SwapCandidate[] } }>(err) && err.response?.data.errors?.candidates) {
        setCandidates(err.response.data.errors.candidates);
        setChosenId(undefined);
        setOpen(true);
      } else {
        message.error(errorMessageFrom(err, "Failed to send this lead to Field Sales"));
      }
    } finally {
      setSending(false);
    }
  };

  const popoverContent = (
    <div style={{ width: 260, display: "flex", flexDirection: "column", gap: 8 }}>
      <Text type="secondary" style={{ fontSize: 12 }}>
        More than one field employee covers this pincode - pick one.
      </Text>
      <Select
        size="small"
        placeholder="Choose a person"
        value={chosenId}
        onChange={setChosenId}
        notFoundContent={<Skeleton.Input active size="small" />}
        options={candidates.map((c) => ({ value: c.id, label: `${c.name} (${c.email})` }))}
      />
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <Button size="small" onClick={() => setOpen(false)}>
          Cancel
        </Button>
        <Button size="small" type="primary" loading={sending} disabled={!chosenId} onClick={() => attempt(chosenId)}>
          Confirm
        </Button>
      </div>
    </div>
  );

  return (
    <Popover content={popoverContent} open={open} onOpenChange={(v) => !v && setOpen(false)} trigger="click" placement="bottomRight">
      <Button size={size} type="primary" icon={<SendOutlined />} loading={sending && !open} onClick={() => attempt()}>
        Send to Field Sales
      </Button>
    </Popover>
  );
}
