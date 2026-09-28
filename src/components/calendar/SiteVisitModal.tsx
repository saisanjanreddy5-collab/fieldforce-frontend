import { useEffect, useState } from "react";
import { Button, Modal, Spin, Typography, message } from "antd";
import { CompassOutlined, EnvironmentOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import * as leadApi from "../../api/lead-api";
import type { Lead } from "../../types/lead";
import { appTokens } from "../../utils/design-system";

const { Text, Title } = Typography;

interface SiteVisitModalProps {
  open: boolean;
  onClose: () => void;
  leadId: string;
  dueDate: string | null;
  purpose: string | null;
}

// Distance-to-office (the reference's "34 km · claimable at ₹12/km" line)
// is deliberately left out - it needs real coordinates for both the lead's
// store and the office to compute honestly, and leads only have a text
// address today, no lat/long. Showing a made-up distance would be worse
// than not showing one.
export function SiteVisitModal({ open, onClose, leadId, dueDate, purpose }: SiteVisitModalProps) {
  const navigate = useNavigate();
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    leadApi
      .getLead(leadId)
      .then(setLead)
      .catch(() => message.error("Failed to load lead details"))
      .finally(() => setLoading(false));
  }, [open, leadId]);

  const address = lead ? [lead.storeAddress, lead.storeCity, lead.storeState, lead.storePincode].filter(Boolean).join(", ") : "";

  const handleDirections = () => {
    if (!address) {
      message.info("No store address on file for this lead");
      return;
    }
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`, "_blank", "noopener,noreferrer");
  };

  const handleLogFuel = () => {
    onClose();
    navigate("/expenses?newClaim=fuel");
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      width={460}
      footer={null}
      title={
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: appTokens.radiusSm,
              background: `${appTokens.warning}17`,
              color: appTokens.warning,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <EnvironmentOutlined />
          </div>
          <div>
            <Title level={5} style={{ margin: 0 }}>
              Site visit — {lead?.storeName ?? lead?.fullName ?? "..."}
            </Title>
            {dueDate && (
              <Text style={{ fontSize: 12, color: appTokens.textTertiary }}>
                {dayjs(dueDate).format("D MMM YYYY, h:mm A")}
                {purpose ? ` · ${purpose}` : ""}
              </Text>
            )}
          </div>
        </div>
      }
    >
      {loading ? (
        <div style={{ textAlign: "center", padding: 24 }}>
          <Spin />
        </div>
      ) : (
        <>
          <Button
            block
            size="large"
            icon={<CompassOutlined />}
            style={{
              background: `${appTokens.warning}17`,
              color: appTokens.warning,
              border: "none",
              fontWeight: 600,
              marginTop: 8,
            }}
            onClick={handleDirections}
          >
            Open directions in Maps
          </Button>
          {address && (
            <Text style={{ fontSize: 11.5, color: appTokens.textTertiary, display: "block", textAlign: "center", marginTop: 6 }}>
              {address}
            </Text>
          )}

          <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 10 }}>
            <Row label="Address" value={address || "Not on file"} />
            <Row label="Contact on site" value={lead?.contactName ? `${lead.contactName}${lead.phone ? ` · ${lead.phone}` : ""}` : lead?.phone || "Not on file"} />
            {purpose && <Row label="Purpose" value={purpose} />}
          </div>

          <div
            style={{
              marginTop: 16,
              padding: "10px 12px",
              borderRadius: appTokens.radiusSm,
              background: appTokens.surfaceMuted,
              fontSize: 12,
              color: appTokens.textSecondary,
            }}
          >
            Address comes from this lead's Store tab.
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 18 }}>
            <Button onClick={handleLogFuel}>Log fuel expense</Button>
            <Button type="primary" onClick={onClose}>
              Close
            </Button>
          </div>
        </>
      )}
    </Modal>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
      <Text style={{ fontSize: 12.5, color: appTokens.textTertiary, flexShrink: 0 }}>{label}</Text>
      <Text style={{ fontSize: 12.5, color: appTokens.textPrimary, textAlign: "right" }}>{value}</Text>
    </div>
  );
}
