import { useEffect, useState } from "react";
import { Button, Input, Modal, Switch, Typography, message } from "antd";
import * as leadCategoryApi from "../../api/lead-category-api";
import type { LeadCategory } from "../../types/lead-category";
import { errorMessageFrom } from "../../utils/api-error";
import { appTokens } from "../../utils/design-system";

const { Text, Title } = Typography;

interface EditCategoryModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  /** null means "create a new one" */
  category: LeadCategory | null;
}

export function EditCategoryModal({ open, onClose, onSaved, category }: EditCategoryModalProps) {
  const isNew = category === null;
  const [key, setKey] = useState("");
  const [label, setLabel] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setKey(category?.key ?? "");
    setLabel(category?.label ?? "");
    setDescription(category?.description ?? "");
    setIsActive(category?.isActive ?? true);
  }, [open, category]);

  const canSave = label.trim().length > 0 && (!isNew || key.trim().length > 0);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (isNew) {
        await leadCategoryApi.createLeadCategory({ key: key.trim(), label: label.trim(), description: description.trim() || undefined });
        message.success("Category created");
      } else {
        await leadCategoryApi.updateLeadCategory(category.key, {
          label: label.trim(),
          description: description.trim() || null,
          isActive,
        });
        message.success("Category updated");
      }
      onSaved();
    } catch (err) {
      message.error(errorMessageFrom(err, "Failed to save category"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      width={440}
      footer={null}
      title={
        <Title level={5} style={{ margin: 0 }}>
          {isNew ? "New category" : `Edit ${category.label}`}
        </Title>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 8 }}>
        {isNew && (
          <div>
            <Text style={{ fontSize: 12, fontWeight: 500 }}>
              Key <span style={{ color: appTokens.danger }}>*</span>
            </Text>
            <Input style={{ marginTop: 4 }} value={key} onChange={(e) => setKey(e.target.value)} placeholder="e.g. Stockist" />
            <Text style={{ fontSize: 11, color: appTokens.textTertiary }}>
              What actually gets stored on the lead - can't be changed once leads use it
            </Text>
          </div>
        )}
        <div>
          <Text style={{ fontSize: 12, fontWeight: 500 }}>Name</Text>
          <Input style={{ marginTop: 4 }} value={label} onChange={(e) => setLabel(e.target.value)} />
        </div>
        <div>
          <Text style={{ fontSize: 12, fontWeight: 500 }}>Description</Text>
          <Input style={{ marginTop: 4 }} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What defines this category" />
        </div>
        {!isNew && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Text style={{ fontSize: 13, fontWeight: 500 }}>Active</Text>
            <Switch checked={isActive} onChange={setIsActive} />
          </div>
        )}
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 20 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button type="primary" loading={saving} disabled={!canSave} onClick={handleSave}>
          Save
        </Button>
      </div>
    </Modal>
  );
}
