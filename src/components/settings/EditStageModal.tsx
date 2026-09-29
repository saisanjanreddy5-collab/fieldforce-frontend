import { useEffect, useState } from "react";
import { Button, Input, InputNumber, Modal, Switch, Typography, message } from "antd";
import * as pipelineStageApi from "../../api/pipeline-stage-api";
import type { PipelineStage } from "../../types/pipeline-stage";
import { errorMessageFrom } from "../../utils/api-error";
import { appTokens } from "../../utils/design-system";

const { Text, Title } = Typography;

interface EditStageModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  /** null means "create a new one" */
  stage: PipelineStage | null;
}

export function EditStageModal({ open, onClose, onSaved, stage }: EditStageModalProps) {
  const isNew = stage === null;
  const [key, setKey] = useState("");
  const [label, setLabel] = useState("");
  const [description, setDescription] = useState("");
  const [probability, setProbability] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setKey(stage?.key ?? "");
    setLabel(stage?.label ?? "");
    setDescription(stage?.description ?? "");
    setProbability(stage?.probability ?? 0);
    setIsActive(stage?.isActive ?? true);
  }, [open, stage]);

  const canSave = label.trim().length > 0 && (!isNew || key.trim().length > 0);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (isNew) {
        await pipelineStageApi.createPipelineStage({
          key: key.trim(),
          label: label.trim(),
          description: description.trim() || undefined,
          probability,
        });
        message.success("Stage created");
      } else {
        await pipelineStageApi.updatePipelineStage(stage.key, {
          label: label.trim(),
          description: description.trim() || null,
          probability,
          isActive,
        });
        message.success("Stage updated");
      }
      onSaved();
    } catch (err) {
      message.error(errorMessageFrom(err, "Failed to save stage"));
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
          {isNew ? "New stage" : `Edit ${stage.label}`}
        </Title>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 8 }}>
        {isNew && (
          <div>
            <Text style={{ fontSize: 12, fontWeight: 500 }}>
              Key <span style={{ color: appTokens.danger }}>*</span>
            </Text>
            <Input style={{ marginTop: 4 }} value={key} onChange={(e) => setKey(e.target.value)} placeholder="e.g. Site visit" />
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
          <Input style={{ marginTop: 4 }} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Guidance shown alongside this stage" />
        </div>
        <div>
          <Text style={{ fontSize: 12, fontWeight: 500 }}>Probability</Text>
          <InputNumber style={{ width: "100%", marginTop: 4 }} min={0} max={100} value={probability} onChange={(v) => setProbability(v ?? 0)} addonAfter="%" />
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
