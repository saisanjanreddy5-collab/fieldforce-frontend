import { useState } from "react";
import { App, Button, Checkbox, Modal, Select, Tag, Typography } from "antd";

const { Text, Title } = Typography;

interface MiningResult {
  id: string;
  business: string;
  location: string;
  signal: string;
  fit: "High" | "Medium" | "Low";
}

// Skeleton UI only - no external business-data provider is connected.
// Results below are illustrative sample data, not a real search.
const SAMPLE_RESULTS: MiningResult[] = [
  { id: "1", business: "Sai Medical & General Store", location: "Pune, Kothrud", signal: "Expanding — 2nd outlet", fit: "High" },
  { id: "2", business: "Aarogya Wellness Mart", location: "Pune, Baner", signal: "Website enquiry twice", fit: "High" },
  { id: "3", business: "Nashik Health Depot", location: "Nashik, College Road", signal: "Stocking competitor", fit: "Medium" },
];

function fitColor(fit: MiningResult["fit"]): string {
  if (fit === "High") return "success";
  if (fit === "Medium") return "warning";
  return "default";
}

interface LeadMiningModalProps {
  open: boolean;
  onClose: () => void;
}

export function LeadMiningModal({ open, onClose }: LeadMiningModalProps) {
  const { message } = App.useApp();
  const [selected, setSelected] = useState<string[]>([]);

  const toggle = (id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  return (
    <Modal title="Lead mining" open={open} onCancel={onClose} footer={null} width={640}>
      <Text type="secondary">Find prospective franchise partners and generate them as leads.</Text>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "16px 0" }}>
        <Select disabled placeholder="Business type" style={{ width: 160 }} />
        <Select disabled placeholder="State" style={{ width: 140 }} />
        <Select disabled placeholder="City" style={{ width: 140 }} />
        <Select disabled placeholder="Employees" style={{ width: 120 }} />
        <Button disabled type="primary">
          Search
        </Button>
      </div>

      <Text type="secondary" style={{ fontSize: 12 }}>
        Sample results shown below - search isn't wired up to a real data provider yet.
      </Text>

      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
        {SAMPLE_RESULTS.map((result) => (
          <div
            key={result.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "10px 12px",
              border: "1px solid #f0f0f0",
              borderRadius: 8,
            }}
          >
            <Checkbox checked={selected.includes(result.id)} onChange={() => toggle(result.id)} />
            <div style={{ flex: 1 }}>
              <Title level={5} style={{ margin: 0 }}>
                {result.business}
              </Title>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {result.location} · {result.signal}
              </Text>
            </div>
            <Tag color={fitColor(result.fit)}>{result.fit}</Tag>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          type="primary"
          disabled={selected.length === 0}
          onClick={() => {
            message.info("Lead generation isn't wired up yet");
            onClose();
          }}
        >
          Generate {selected.length} lead{selected.length === 1 ? "" : "s"}
        </Button>
      </div>
    </Modal>
  );
}
