import { useEffect, useState } from "react";
import { Button, Tag, Typography, message } from "antd";
import * as assignmentRuleApi from "../../api/assignment-rule-api";
import type { AssignmentRule } from "../../types/assignment-rule";
import { appTokens } from "../../utils/design-system";
import { EditAssignmentRuleModal } from "./EditAssignmentRuleModal";

const { Text } = Typography;

export function AssignmentRulesTab() {
  const [rules, setRules] = useState<AssignmentRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<AssignmentRule | null>(null);
  const [creating, setCreating] = useState(false);

  const load = () => {
    setLoading(true);
    assignmentRuleApi
      .listAssignmentRules()
      .then(setRules)
      .catch(() => message.error("Failed to load assignment rules"))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

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
          Lead assignment rules
        </Text>
        <div>
          <Text style={{ fontSize: 12.5, color: appTokens.textTertiary }}>
            A new lead with no owner picked auto-assigns by state + category match, checked when it's created. No quota or round-robin yet - each rule points to exactly one person.
          </Text>
        </div>
      </div>

      {!loading && rules.length === 0 && (
        <div style={{ padding: "32px 18px", textAlign: "center" }}>
          <Text style={{ color: appTokens.textTertiary, fontSize: 13 }}>
            No rules configured yet - new leads with no owner picked fall back to whoever created them.
          </Text>
        </div>
      )}

      {!loading &&
        rules.map((rule, idx) => (
          <div
            key={rule.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 18,
              padding: "14px 28px 14px 18px",
              borderBottom: idx === rules.length - 1 ? "none" : `1px solid ${appTokens.borderLight}`,
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <Text strong style={{ fontSize: 13.5 }}>
                {rule.stateName}
                {rule.category ? ` + ${rule.category}` : " — all categories"}
              </Text>
              <div>
                <Text style={{ fontSize: 12, color: appTokens.textTertiary }}>Assign to {rule.assignedUserName}</Text>
              </div>
            </div>
            <Tag
              style={{
                margin: 0,
                width: 68,
                textAlign: "center",
                fontWeight: 600,
                border: "none",
                color: rule.isActive ? appTokens.success : appTokens.textTertiary,
                background: rule.isActive ? `${appTokens.success}17` : appTokens.surfaceMuted,
                flexShrink: 0,
              }}
            >
              {rule.isActive ? "Active" : "Inactive"}
            </Tag>
            <Button size="small" type="link" onClick={() => setEditing(rule)}>
              Edit
            </Button>
          </div>
        ))}

      <div style={{ padding: "14px 18px" }}>
        <Button onClick={() => setCreating(true)}>+ Add rule</Button>
      </div>

      <EditAssignmentRuleModal
        open={editing !== null || creating}
        onClose={() => {
          setEditing(null);
          setCreating(false);
        }}
        rule={editing}
        onSaved={() => {
          setEditing(null);
          setCreating(false);
          load();
        }}
      />
    </div>
  );
}
