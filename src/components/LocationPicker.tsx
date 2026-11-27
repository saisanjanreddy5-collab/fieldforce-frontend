import { useEffect, useState } from "react";
import { Button, Select, Tag, Typography } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import * as geographyApi from "../api/geography-api";
import type { Area, City, State } from "../api/geography-api";
import type { UserTerritory, UserTerritoryInput } from "../types/user";
import { appTokens } from "../utils/design-system";

const { Text } = Typography;

// One picked location plus the text shown for it.
export interface PickedLocation extends UserTerritoryInput {
  label: string;
}

const keyOf = (l: UserTerritoryInput) => `${l.stateId}|${l.cityId ?? ""}|${l.areaId ?? ""}`;

// A saved location (names come back from the API) -> a picked one.
export function toPickedLocation(t: UserTerritory): PickedLocation {
  const label = t.areaName
    ? `${t.stateName} › ${t.cityName} › ${t.areaName}${t.pincode ? ` (${t.pincode})` : ""}`
    : t.cityName
    ? `${t.stateName} › ${t.cityName} · whole city`
    : `${t.stateName} · whole state`;
  return { stateId: t.stateId, cityId: t.cityId ?? undefined, areaId: t.areaId ?? undefined, label };
}

// State -> City -> Area. Picking an area adds it to the list at once; the
// button adds the whole selected city (or the whole state when no city is
// picked). Works as a Form.Item control (value / onChange).
// onPendingChange reports a state/city picked but not added yet (its label,
// or null) - so the form can stop a save that would silently drop it.
export function LocationPicker({
  value = [],
  onChange,
  onPendingChange,
}: {
  value?: PickedLocation[];
  onChange?: (next: PickedLocation[]) => void;
  onPendingChange?: (pending: string | null) => void;
}) {
  const [states, setStates] = useState<State[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [stateId, setStateId] = useState<string>();
  const [cityId, setCityId] = useState<string>();
  const [loadingCities, setLoadingCities] = useState(false);
  const [loadingAreas, setLoadingAreas] = useState(false);
  // True from picking a state/city until something from it is added.
  const [pending, setPending] = useState(false);

  const state = states.find((s) => s.id === stateId);
  const city = cities.find((c) => c.id === cityId);
  const wholeLabel = city ? `${state?.name} › ${city.name}` : state?.name;

  useEffect(() => {
    onPendingChange?.(pending && wholeLabel ? wholeLabel : null);
  }, [pending, wholeLabel, onPendingChange]);

  useEffect(() => {
    geographyApi.listStates().then(setStates).catch(() => undefined);
  }, []);

  useEffect(() => {
    setCities([]);
    setCityId(undefined);
    if (!stateId) return;
    setLoadingCities(true);
    geographyApi
      .listCities(stateId)
      .then(setCities)
      .catch(() => undefined)
      .finally(() => setLoadingCities(false));
  }, [stateId]);

  useEffect(() => {
    setAreas([]);
    if (!cityId) return;
    setLoadingAreas(true);
    geographyApi
      .listAreas(cityId)
      .then(setAreas)
      .catch(() => undefined)
      .finally(() => setLoadingAreas(false));
  }, [cityId]);

  const addPicked = (picked: PickedLocation) => {
    setPending(false);
    if (value.some((l) => keyOf(l) === keyOf(picked))) return;
    onChange?.([...value, picked]);
  };

  const addArea = (areaId: string) => {
    const a = areas.find((x) => x.id === areaId);
    if (!a || !state || !city) return;
    addPicked({ stateId: state.id, cityId: city.id, areaId: a.id, label: `${state.name} › ${city.name} › ${a.name}${a.pincode ? ` (${a.pincode})` : ""}` });
  };

  const addWhole = () => {
    if (!state) return;
    addPicked(
      city
        ? { stateId: state.id, cityId: city.id, label: `${state.name} › ${city.name} · whole city` }
        : { stateId: state.id, label: `${state.name} · whole state` }
    );
  };

  const remove = (key: string) => onChange?.(value.filter((l) => keyOf(l) !== key));
  const added = new Set(value.map((l) => l.areaId).filter(Boolean));

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
        <Select
          showSearch
          allowClear
          placeholder="State"
          value={stateId}
          onChange={(v) => {
            setStateId(v);
            setPending(Boolean(v));
          }}
          optionFilterProp="label"
          options={states.map((s) => ({ value: s.id, label: s.name }))}
        />
        <Select
          showSearch
          allowClear
          placeholder={stateId ? "City" : "Pick a state first"}
          disabled={!stateId}
          loading={loadingCities}
          value={cityId}
          onChange={(v) => {
            setCityId(v);
            setPending(Boolean(stateId));
          }}
          optionFilterProp="label"
          options={cities.map((c) => ({ value: c.id, label: c.name }))}
        />
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <Select
          showSearch
          style={{ flex: 1, minWidth: 0 }}
          placeholder={cityId ? "Pick an area to add it - search by name or pincode" : "Pick a city to choose areas"}
          disabled={!cityId}
          loading={loadingAreas}
          // Always empty: picking an area adds it to the list below at once.
          value={null}
          onChange={(v: string | null) => v && addArea(v)}
          optionFilterProp="label"
          options={areas.map((a) => ({
            value: a.id,
            label: `${a.name}${a.pincode ? ` · ${a.pincode}` : ""}`,
            disabled: added.has(a.id),
          }))}
        />
        <Button icon={<PlusOutlined />} disabled={!state} onClick={addWhole} title={state ? `Cover every area in ${wholeLabel}` : undefined}>
          {state ? `Add all of ${city ? city.name : state.name}` : "Add"}
        </Button>
      </div>

      <div
        style={{
          marginTop: 10,
          padding: value.length ? 8 : 10,
          border: `1px dashed ${appTokens.border}`,
          borderRadius: appTokens.radiusSm,
          background: appTokens.surface,
          display: "flex",
          flexWrap: "wrap",
          gap: 6,
        }}
      >
        {value.length === 0 ? (
          <Text type="secondary" style={{ fontSize: 12 }}>
            No locations yet - pick an area, or use “Add all of …” for a whole city or state
          </Text>
        ) : (
          value.map((l) => (
            <Tag key={keyOf(l)} closable onClose={() => remove(keyOf(l))} style={{ margin: 0 }}>
              {l.label}
            </Tag>
          ))
        )}
      </div>
    </div>
  );
}
