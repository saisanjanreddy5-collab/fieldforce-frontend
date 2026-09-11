import { useState } from "react";
import { Button, Card, Tag, Typography } from "antd";
import { CloseOutlined, PhoneOutlined } from "@ant-design/icons";

const { Title, Text } = Typography;

// Skeleton UI only - no telephony/Asterisk backend is connected yet.
// Shows illustrative sample content matching the intended layout so it's
// ready to wire up to real call data once the telephony API is available.
const SAMPLE_QUEUE = [
  { name: "Kumar Wellness Hub", reason: "Follow-up 2 days overdue" },
  { name: "Sayona Lifestyle Store", reason: "First qualification call" },
];

export function SoftphoneWidget() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Tag
        color="default"
        style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 4, margin: 0 }}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#c3c2b7", display: "inline-block" }} />
        Softphone
      </Tag>

      {open && (
        <Card
          size="small"
          style={{
            position: "fixed",
            bottom: 16,
            right: 16,
            width: 280,
            zIndex: 1000,
            boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
          }}
          title={
            <span>
              <PhoneOutlined /> Softphone · Not connected
            </span>
          }
          extra={<CloseOutlined onClick={() => setOpen(false)} />}
        >
          <Text type="secondary" style={{ fontSize: 12 }}>
            Telephony integration isn't connected yet - credentials coming later. Layout below previews how an
            active call will look.
          </Text>

          <div style={{ marginTop: 12, opacity: 0.5 }}>
            <Title level={5} style={{ margin: 0 }}>
              No active call
            </Title>
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <Button size="small" disabled>
                Mute
              </Button>
              <Button size="small" disabled>
                Hold
              </Button>
              <Button size="small" danger disabled>
                End
              </Button>
            </div>
          </div>

          <div style={{ marginTop: 16 }}>
            <Text strong style={{ fontSize: 11, textTransform: "uppercase" }}>
              Next in queue
            </Text>
            <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 6 }}>
              {SAMPLE_QUEUE.map((item) => (
                <div key={item.name}>
                  <Text style={{ fontSize: 13 }}>{item.name}</Text>
                  <div>
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      {item.reason}
                    </Text>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}
    </>
  );
}
