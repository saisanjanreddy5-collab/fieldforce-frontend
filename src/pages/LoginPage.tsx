import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Alert, Button, Card, Col, Form, Input, Row, Typography } from "antd";
import { LockOutlined, UserOutlined } from "@ant-design/icons";
import { isAxiosError } from "axios";
import { useAuth } from "../context/AuthContext";

const { Title, Text } = Typography;

interface LoginFormValues {
  email: string;
  password: string;
}

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const from = (location.state as { from?: string } | null)?.from ?? "/";

  const handleFinish = async (values: LoginFormValues): Promise<void> => {
    setSubmitting(true);
    setErrorMessage(null);
    try {
      await login(values.email, values.password);
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
    <Row justify="center" align="middle" style={{ minHeight: "100vh", padding: 16, background: "#f5f5f5" }}>
      <Col xs={24} sm={20} md={14} lg={8} xl={6}>
        <Card>
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <Title level={3} style={{ marginBottom: 4 }}>
              FieldForce
            </Title>
            <Text type="secondary">Sign in to your account</Text>
          </div>

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
              <Input prefix={<UserOutlined />} placeholder="you@company.com" size="large" autoComplete="username" />
            </Form.Item>

            <Form.Item name="password" label="Password" rules={[{ required: true, message: "Please enter your password" }]}>
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="Password"
                size="large"
                autoComplete="current-password"
              />
            </Form.Item>

            <Form.Item style={{ marginBottom: 0 }}>
              <Button type="primary" htmlType="submit" block size="large" loading={submitting}>
                Sign In
              </Button>
            </Form.Item>
          </Form>
        </Card>
      </Col>
    </Row>
  );
}
