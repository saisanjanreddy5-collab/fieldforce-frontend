import { useEffect, useState } from "react";
import { Alert, Descriptions, Empty, Spin, message } from "antd";
import { CheckCircleFilled } from "@ant-design/icons";
import * as leadApi from "../../../api/lead-api";
import type { LeadConsent } from "../../../types/lead";
import { formatDateTime } from "../../../utils/lead-format";

interface ConsentTabProps {
  leadId: string;
}

export function ConsentTab({ leadId }: ConsentTabProps) {
  const [consent, setConsent] = useState<LeadConsent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    leadApi
      .getLeadConsent(leadId)
      .then(setConsent)
      .catch(() => message.error("Failed to load consent"))
      .finally(() => setLoading(false));
  }, [leadId]);

  if (loading) return <Spin />;

  if (!consent || !consent.captured) {
    return <Empty description="No DPDP consent captured yet for this lead" />;
  }

  return (
    <div>
      <Alert
        type="success"
        icon={<CheckCircleFilled />}
        showIcon
        title="DPDP consent — captured"
        description={
          consent.method
            ? `Granted via ${consent.method}${consent.capturedAt ? ` · ${formatDateTime(consent.capturedAt)}` : ""}`
            : "Consent granted"
        }
        style={{ marginBottom: 16 }}
      />
      <Descriptions column={1} size="small" bordered>
        <Descriptions.Item label="Purposes">{consent.purposes ?? "-"}</Descriptions.Item>
        <Descriptions.Item label="Evidence">{consent.evidenceRef ?? "-"}</Descriptions.Item>
        <Descriptions.Item label="Notes">{consent.notes || "-"}</Descriptions.Item>
        <Descriptions.Item label="Status">{consent.status}</Descriptions.Item>
      </Descriptions>
    </div>
  );
}
