import { useEffect, useState } from "react";
import { Button, Tag, Typography, message } from "antd";
import { HolderOutlined } from "@ant-design/icons";
import * as leadCategoryApi from "../../api/lead-category-api";
import type { LeadCategory } from "../../types/lead-category";
import { appTokens } from "../../utils/design-system";
import { EditCategoryModal } from "./EditCategoryModal";

const { Text } = Typography;

export function CategoriesTab() {
  const [categories, setCategories] = useState<LeadCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<LeadCategory | null>(null);
  const [creating, setCreating] = useState(false);
  const [draggingKey, setDraggingKey] = useState<string | null>(null);
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    leadCategoryApi
      .listLeadCategories()
      .then(setCategories)
      .catch(() => message.error("Failed to load categories"))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleDrop = async (targetKey: string) => {
    if (!draggingKey || draggingKey === targetKey) {
      setDraggingKey(null);
      setDragOverKey(null);
      return;
    }
    const reordered = [...categories];
    const fromIndex = reordered.findIndex((c) => c.key === draggingKey);
    const toIndex = reordered.findIndex((c) => c.key === targetKey);
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);
    setCategories(reordered);
    setDraggingKey(null);
    setDragOverKey(null);
    try {
      await leadCategoryApi.reorderLeadCategories(reordered.map((c) => c.key));
    } catch {
      message.error("Failed to save the new order");
      load();
    }
  };

  return (
    <div
      style={{
        border: `1px solid ${appTokens.border}`,
        borderRadius: appTokens.radius,
        background: appTokens.surface,
        boxShadow: appTokens.shadowSm,
      }}
    >
      <div style={{ padding: "14px 18px", borderBottom: `1px solid ${appTokens.borderLight}` }}>
        <Text strong style={{ fontSize: 14 }}>
          Customer categories
        </Text>
        <div>
          <Text style={{ fontSize: 12.5, color: appTokens.textTertiary }}>What kind of account this lead becomes once converted</Text>
        </div>
      </div>

      {!loading &&
        categories.map((category, idx) => {
          const isDragOver = dragOverKey === category.key && draggingKey !== category.key;
          return (
            <div
              key={category.key}
              draggable
              onDragStart={() => setDraggingKey(category.key)}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverKey(category.key);
              }}
              onDragLeave={() => setDragOverKey((prev) => (prev === category.key ? null : prev))}
              onDrop={(e) => {
                e.preventDefault();
                handleDrop(category.key);
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 18,
                padding: "14px 28px 14px 18px",
                borderBottom: idx === categories.length - 1 ? "none" : `1px solid ${appTokens.borderLight}`,
                background: isDragOver ? appTokens.primarySoft : appTokens.surface,
                opacity: draggingKey === category.key ? 0.4 : 1,
                cursor: "grab",
              }}
            >
              <HolderOutlined style={{ color: appTokens.textTertiary, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <Text strong style={{ fontSize: 13.5 }}>
                  {category.label}
                </Text>
                <div>
                  <Text style={{ fontSize: 12, color: appTokens.textTertiary }}>{category.description ?? "—"}</Text>
                </div>
              </div>
              <Tag
                style={{
                  margin: 0,
                  width: 68,
                  textAlign: "center",
                  fontWeight: 600,
                  border: "none",
                  color: category.isActive ? appTokens.success : appTokens.textTertiary,
                  background: category.isActive ? `${appTokens.success}17` : appTokens.surfaceMuted,
                  flexShrink: 0,
                }}
              >
                {category.isActive ? "Active" : "Inactive"}
              </Tag>
              <Button size="small" type="link" onClick={() => setEditing(category)}>
                Edit
              </Button>
            </div>
          );
        })}

      <div style={{ padding: "14px 18px" }}>
        <Button onClick={() => setCreating(true)}>+ Add category</Button>
      </div>

      <EditCategoryModal
        open={editing !== null || creating}
        onClose={() => {
          setEditing(null);
          setCreating(false);
        }}
        category={editing}
        onSaved={() => {
          setEditing(null);
          setCreating(false);
          load();
        }}
      />
    </div>
  );
}
