import { useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Alert, Button, Card, Col, Form, Input, Row, Typography } from "antd";
import { LockOutlined, ThunderboltFilled, UserOutlined } from "@ant-design/icons";
import { isAxiosError } from "axios";
import { useAuth } from "../context/AuthContext";
import { appTokens } from "../utils/design-system";

const { Title, Text } = Typography;

interface LoginFormValues {
  email: string;
  password: string;
}

// ?ssoContinue= comes from the URL, so anyone can craft a login link with
// any value in it. Only ever follow it back to our own backend's
// /sso/authorize step - anything else (another site, a javascript: URL) is
// ignored and the user just lands in the app as a normal login.
function safeSsoContinue(raw: string | null): string | null {
  if (!raw) return null;
  try {
    const target = new URL(raw);
    // Only our own backend's two SSO steps: the Helpdesk one-click launch,
    // and the authorize step Frappe's "Login with FieldForce" button uses.
    const api = new URL(`${import.meta.env.VITE_API_BASE_URL}`, window.location.origin);
    const apiPath = api.pathname.replace(/\/+$/, "");
    const sameEndpoint =
      target.origin === api.origin && (target.pathname === `${apiPath}/sso/authorize` || target.pathname === `${apiPath}/sso/launch`);
    return (target.protocol === "https:" || target.protocol === "http:") && sameEndpoint ? target.toString() : null;
  } catch {
    return null;
  }
}

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const from = (location.state as { from?: string } | null)?.from ?? "/";
  // Set by the backend's GET /sso/authorize when it bounced a not-yet-
  // logged-in browser here (Frappe Helpdesk's own "Login with..." button) -
  // once login succeeds we send the browser straight back there with a real
  // page load, not an SPA navigate, so /sso/authorize runs again and this
  // time finds the session cookie login() just set.
  const ssoContinue = safeSsoContinue(searchParams.get("ssoContinue"));

  const handleFinish = async (values: LoginFormValues): Promise<void> => {
    setSubmitting(true);
    setErrorMessage(null);
    try {
      await login(values.email, values.password);
      if (ssoContinue) {
        window.location.href = ssoContinue;
        return;
      }
      navigate(from, { replace: true });
    } catch (error) {
      if (isAxiosError<{ message?: string }>(error) && error.response?.data.message) {
        setErrorMessage(error.response.data.message);
      } else {
        setErrorMessage("Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Row
      justify="center"
      align="middle"
      style={{
        minHeight: "100vh",
        padding: 16,
        background: `radial-gradient(circle at 20% 20%, #16294f 0%, ${appTokens.sidebarBg} 45%, #060a14 100%)`,
        fontFamily: appTokens.font,
      }}
    >
      <Col xs={24} sm={20} md={14} lg={8} xl={6}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 14,
              background: `linear-gradient(135deg, ${appTokens.primary}, #3f6fef)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
              boxShadow: "0 10px 28px rgba(19,84,224,0.45)",
            }}
          >
            <ThunderboltFilled style={{ color: "#fff", fontSize: 24 }} />
          </div>
          <Title level={3} style={{ margin: 0, color: "#fff", letterSpacing: -0.3 }}>
            FieldForce
          </Title>
          <Text style={{ color: "rgba(255,255,255,0.55)", fontSize: 13.5 }}>Sign in to your account</Text>
        </div>

        <Card
          style={{
            border: "none",
            borderRadius: appTokens.radiusLg,
            boxShadow: appTokens.shadowLg,
          }}
          styles={{ body: { padding: 28 } }}
        >
          {errorMessage && <Alert type="error" title={errorMessage} showIcon style={{ marginBottom: 16 }} />}

          <Form<LoginFormValues> layout="vertical" onFinish={handleFinish} requiredMark={false}>
            <Form.Item
              name="email"
              label="Email"
              rules={[
                { required: true, message: "Please enter your email" },
                { type: "email", message: "Enter a valid email address" },
              ]}
            >
              <Input prefix={<UserOutlined style={{ color: appTokens.textTertiary }} />} placeholder="you@company.com" size="large" autoComplete="username" />
            </Form.Item>

            <Form.Item name="password" label="Password" rules={[{ required: true, message: "Please enter your password" }]}>
              <Input.Password
                prefix={<LockOutlined style={{ color: appTokens.textTertiary }} />}
                placeholder="Password"
                size="large"
                autoComplete="current-password"
              />
            </Form.Item>

            <Form.Item style={{ marginBottom: 0, marginTop: 8 }}>
              <Button
                type="primary"
                htmlType="submit"
                block
                size="large"
                loading={submitting}
                style={{ fontWeight: 700, boxShadow: "0 4px 14px rgba(19,84,224,0.35)" }}
              >
                Sign In
              </Button>
            </Form.Item>
          </Form>
        </Card>
      </Col>
    </Row>
  );
}
