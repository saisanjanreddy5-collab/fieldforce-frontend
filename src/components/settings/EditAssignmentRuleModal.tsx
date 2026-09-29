import { useEffect, useState } from "react";
import { Button, Modal, Select, Switch, Typography, message } from "antd";
import * as assignmentRuleApi from "../../api/assignment-rule-api";
import * as geographyApi from "../../api/geography-api";
import * as userApi from "../../api/user-api";
import { useLeadCategories } from "../../hooks/use-lead-categories";
import type { AssignmentRule } from "../../types/assignment-rule";
import type { State } from "../../api/geography-api";
import type { TeamMember } from "../../types/user";
import { errorMessageFrom } from "../../utils/api-error";
import { appTokens } from "../../utils/design-system";

const { Text, Title } = Typography;

interface EditAssignmentRuleModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  /** null means "create a new one" */
  rule: AssignmentRule | null;
}

export function EditAssignmentRuleModal({ open, onClose, onSaved, rule }: EditAssignmentRuleModalProps) {
  const isNew = rule === null;
  const { categories } = useLeadCategories();
  const [states, setStates] = useState<State[]>([]);
  const [users, setUsers] = useState<TeamMember[]>([]);
  const [stateId, setStateId] = useState<string | undefined>();
  const [category, setCategory] = useState<string | undefined>();
  const [assignedUserId, setAssignedUserId] = useState<string | undefined>();
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setStateId(rule?.stateId ?? undefined);
    setCategory(rule?.category ?? undefined);
    setAssignedUserId(rule?.assignedUserId ?? undefined);
    setIsActive(rule?.isActive ?? true);
    geographyApi.listStates().then(setStates).catch(() => undefined);
    userApi.listUsers().then(setUsers).catch(() => undefined);
  }, [open, rule]);

  const canSave = (!isNew || stateId !== undefined) && assignedUserId !== undefined;

  const handleSave = async () => {
    setSaving(true);
    try {
      if (isNew) {
        if (!stateId || !assignedUserId) return;
        await assignmentRuleApi.createAssignmentRule({ stateId, category, assignedUserId });
        message.success("Assignment rule created");
      } else {
        await assignmentRuleApi.updateAssignmentRule(rule.id, { category: category ?? null, assignedUserId, isActive });
        message.success("Assignment rule updated");
      }
      onSaved();
    } catch (err) {
      message.error(errorMessageFrom(err, "Failed to save the rule"));
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
          {isNew ? "New assignment rule" : "Edit assignment rule"}
        </Title>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 8 }}>
        <div>
          <Text style={{ fontSize: 12, fontWeight: 500 }}>
            State <span style={{ color: appTokens.danger }}>*</span>
          </Text>
          <Select
            style={{ width: "100%", marginTop: 4 }}
            disabled={!isNew}
            value={stateId}
            onChange={setStateId}
            showSearch
            optionFilterProp="label"
            options={states.map((s) => ({ value: s.id, label: s.name }))}
          />
          {!isNew && <Text style={{ fontSize: 11, color: appTokens.textTertiary }}>State can't change once a rule exists - delete and recreate instead</Text>}
        </div>
        <div>
          <Text style={{ fontSize: 12, fontWeight: 500 }}>Category</Text>
          <Select
            style={{ width: "100%", marginTop: 4 }}
            allowClear
            placeholder="Any category (matches when no more specific rule fits)"
            value={category}
            onChange={setCategory}
            options={categories.filter((c) => c.isActive).map((c) => ({ value: c.key, label: c.label }))}
          />
        </div>
        <div>
          <Text style={{ fontSize: 12, fontWeight: 500 }}>
            Assign to <span style={{ color: appTokens.danger }}>*</span>
          </Text>
          <Select
            style={{ width: "100%", marginTop: 4 }}
            showSearch
            optionFilterProp="label"
            value={assignedUserId}
            onChange={setAssignedUserId}
            options={users.map((u) => ({ value: u.id, label: u.name }))}
          />
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
