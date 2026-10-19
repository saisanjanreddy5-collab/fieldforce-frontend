import { useState } from "react";
import { Form, Input, Modal, Typography, message } from "antd";
import * as userApi from "../api/user-api";
import type { TeamMember } from "../types/user";
import { errorMessageFrom } from "../utils/api-error";

const { Text } = Typography;

interface ResetPasswordModalProps {
  user: TeamMember | null;
  onClose: () => void;
}

interface FormValues {
  newPassword: string;
  confirmPassword: string;
}

// Admin-only (gated by the caller on users.reset_password - see
// SalesForceManagementPage.tsx) - sets someone else's password directly, no
// current-password proof needed since the admin's own session is the proof
// here. Logs the target out everywhere the moment this succeeds.
export function ResetPasswordModal({ user, onClose }: ResetPasswordModalProps) {
  const [form] = Form.useForm<FormValues>();
  const [submitting, setSubmitting] = useState(false);

  const handleClose = () => {
    form.resetFields();
    onClose();
  };

  const submit = async (values: FormValues) => {
    if (!user) return;
    setSubmitting(true);
    try {
      await userApi.resetPassword(user.id, values.newPassword);
      message.success(`Password reset for ${user.name}`);
      handleClose();
    } catch (err) {
      message.error(errorMessageFrom(err, "Failed to reset password"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title={user ? `Reset password - ${user.name}` : "Reset password"}
      open={Boolean(user)}
      onCancel={handleClose}
      onOk={() => form.submit()}
      okText="Reset password"
      confirmLoading={submitting}
      destroyOnClose
    >
      <Text type="secondary" style={{ fontSize: 12.5 }}>
        {user?.name} will be logged out everywhere and will need to sign in again with this new password. Share it
        with them directly - it won't be shown again here.
      </Text>
      <Form form={form} layout="vertical" onFinish={submit} style={{ marginTop: 16 }}>
        <Form.Item
          name="newPassword"
          label="New password"
          rules={[
            { required: true, message: "Enter a new password" },
            { min: 8, message: "At least 8 characters" },
          ]}
        >
          <Input.Password autoComplete="new-password" />
        </Form.Item>
        <Form.Item
          name="confirmPassword"
          label="Confirm new password"
          dependencies={["newPassword"]}
          rules={[
            { required: true, message: "Confirm the new password" },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || value === getFieldValue("newPassword")) return Promise.resolve();
                return Promise.reject(new Error("Passwords don't match"));
              },
            }),
          ]}
        >
          <Input.Password autoComplete="new-password" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
