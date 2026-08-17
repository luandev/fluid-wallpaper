import { createRoot, type Root } from "react-dom/client";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  MAX_EMITTERS,
  MAX_MATERIALS,
  MAX_VALUE_BINDINGS,
  MAX_VALUE_EMITTERS,
  MAX_WIND_STATIONS,
  MIN_MATERIALS,
  RESEED_KEYS,
  VALUE_EMITTER_KINDS,
  VALUE_EMITTER_STUB_KINDS,
  cloneConfig,
  controlSchema,
  createEmitter,
  createMaterial,
  createValueBinding,
  createValueEmitter,
  createWindStation,
  defaultConfig,
  scatterWindStations,
  type ControlGroup,
  type EmitterKind,
  type FluidConfig,
  type FluidEmitter,
  type FluidMaterial,
  type ValueEmitterKind,
  type WindStation,
} from "../app/config";
import { BINDABLE_PATHS, driverNameForPath, evaluateEmitter, getPath, wave01 } from "../app/drivers";
import type { Engine } from "../app/engine";
import { deletePreset, loadPresets, upsertPreset, type FluidPreset } from "../app/presets";
import { saveStoredConfig } from "../app/storage";
import { attachDraggablePanel, restorePanelPosition } from "../app/dragPanel";
import { ColorRow, RangeRow, SelectRow, ToggleRow } from "./rows";
import "./dashboard.css";

const GROUPS: ControlGroup[] = ["Look", "Flow", "Composer", "Quality", "Input"];
const TABS = ["Scene", "Materials", "Emitters", "Wind", "Drivers", "Presets"] as const;
type Tab = (typeof TABS)[number];

function kindLabel(kind: ValueEmitterKind): string {
  if ((VALUE_EMITTER_STUB_KINDS as readonly string[]).includes(kind)) {
    return `${kind} (later)`;
  }
  return kind;
}

function isTypingTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.tagName === "INPUT" || target.tagName === "SELECT" || target.tagName === "TEXTAREA" || target.isContentEditable)
  );
}

type DashboardProps = {
  engine: Engine;
};

export function Dashboard({ engine }: DashboardProps): ReactNode {
  const [open, setOpen] = useState(true);
  const [tab, setTab] = useState<Tab>("Scene");
  const [config, setConfig] = useState<FluidConfig>(() => engine.getConfig());
  const [live, setLive] = useState<FluidConfig>(() => engine.getLiveConfig());
  const [elapsed, setElapsed] = useState(() => engine.getElapsed());
  const dashRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const fabRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    let raf = 0;
    const tick = (): void => {
      setLive(engine.getLiveConfig());
      setElapsed(engine.getElapsed());
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [engine, open]);

  useEffect(() => {
    const dash = dashRef.current;
    const header = headerRef.current;
    if (!dash || !header) {
      return;
    }
    return attachDraggablePanel({ element: dash, handle: header, id: "dash" });
  }, []);

  useEffect(() => {
    const fab = fabRef.current;
    if (!fab) {
      return;
    }
    return attachDraggablePanel({ element: fab, handle: fab, id: "dashFab" });
  }, []);

  useEffect(() => {
    if (open && dashRef.current) {
      restorePanelPosition(dashRef.current, "dash");
    }
  }, [open]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.code !== "KeyH" || event.repeat || isTypingTarget(event.target)) {
        return;
      }
      setOpen((current) => !current);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const commit = useCallback(
    (patch: Partial<FluidConfig>, reseed = false): FluidConfig => {
      const next = engine.applyConfig(patch);
      saveStoredConfig(next);
      if (reseed) {
        engine.reseed();
      }
      setConfig(next);
      return next;
    },
    [engine],
  );

  const patchFrom = useCallback(
    (builder: (current: FluidConfig) => Partial<FluidConfig>, reseed = false): FluidConfig => {
      return commit(builder(engine.getConfig()), reseed);
    },
    [commit, engine],
  );

  return (
    <>
      <div ref={dashRef} className="dash" data-open={open ? "true" : "false"}>
        <header ref={headerRef} className="dash__header">
          <h2 className="dash__title">Dashboard</h2>
          <p className="dash__hint">Drag header to move · H hides panel · F hides perf</p>
        </header>
        <div className="dash__tabs" role="tablist">
          {TABS.map((name) => (
            <button
              key={name}
              type="button"
              className="dash__tab"
              role="tab"
              data-active={tab === name ? "true" : "false"}
              aria-selected={tab === name}
              onClick={() => setTab(name)}
            >
              {name}
            </button>
          ))}
        </div>
        <div className="dash__body">
          {tab === "Scene" ? <SceneTab config={config} live={live} commit={commit} /> : null}
          {tab === "Materials" ? <MaterialsTab config={config} live={live} patchFrom={patchFrom} /> : null}
          {tab === "Emitters" ? <EmittersTab config={config} live={live} patchFrom={patchFrom} /> : null}
          {tab === "Wind" ? <WindTab config={config} live={live} patchFrom={patchFrom} /> : null}
          {tab === "Drivers" ? (
            <DriversTab config={config} live={live} elapsed={elapsed} patchFrom={patchFrom} />
          ) : null}
          {tab === "Presets" ? <PresetsTab engine={engine} setConfig={setConfig} /> : null}
        </div>
        <div className="dash__actions">
          <button type="button" className="dash__btn" onClick={() => engine.reseed()}>
            Reseed
          </button>
          <button
            type="button"
            className="dash__btn"
            onClick={() => {
              commit(cloneConfig(defaultConfig), true);
            }}
          >
            Reset defaults
          </button>
        </div>
      </div>
      <button
        ref={fabRef}
        type="button"
        className="dash__fab"
        aria-label="Toggle dashboard"
        title="Click to toggle, drag to move"
        onClick={() => setOpen((current) => !current)}
      >
        Panel
      </button>
    </>
  );
}

function SceneTab({
  config,
  live,
  commit,
}: {
  config: FluidConfig;
  live: FluidConfig;
  commit: (patch: Partial<FluidConfig>, reseed?: boolean) => FluidConfig;
}): ReactNode {
  return (
    <>
      {GROUPS.map((group) => (
        <section key={group} className="dash__group">
          <h3 className="dash__group-title">{group}</h3>
          {controlSchema
            .filter((control) => control.group === group)
            .map((control) => {
              if (control.kind === "toggle") {
                return (
                  <ToggleRow
                    key={String(control.key)}
                    label={control.label}
                    value={Boolean(config[control.key])}
                    onChange={(value) => commit({ [control.key]: value } as Partial<FluidConfig>)}
                  />
                );
              }
              if (control.kind === "select") {
                return (
                  <SelectRow
                    key={String(control.key)}
                    label={control.label}
                    value={String(config[control.key])}
                    options={control.options ?? []}
                    onChange={(value) =>
                      commit({ [control.key]: value } as Partial<FluidConfig>, Boolean(control.reseed))
                    }
                  />
                );
              }
              if (control.kind !== "range" || control.min === undefined || control.max === undefined) {
                return null;
              }
              const path = String(control.key);
              const driverName = driverNameForPath(config, path);
              return (
                <RangeRow
                  key={path}
                  label={control.label}
                  value={Number(config[control.key])}
                  live={Number(live[control.key])}
                  min={control.min}
                  max={control.max}
                  step={control.step ?? 0.01}
                  driverName={driverName}
                  onChange={(value) =>
                    commit({ [control.key]: value } as Partial<FluidConfig>, Boolean(control.reseed) || RESEED_KEYS.has(control.key))
                  }
                />
              );
            })}
        </section>
      ))}
    </>
  );
}

function MaterialsTab({
  config,
  live,
  patchFrom,
}: {
  config: FluidConfig;
  live: FluidConfig;
  patchFrom: (builder: (current: FluidConfig) => Partial<FluidConfig>, reseed?: boolean) => FluidConfig;
}): ReactNode {
  return (
    <section className="dash__group">
      <div className="dash__group-head">
        <h3 className="dash__group-title">Materials</h3>
        <button
          type="button"
          className="dash__btn"
          disabled={config.materials.length >= MAX_MATERIALS}
          onClick={() =>
            patchFrom((current) => {
              const material = createMaterial(current.materials);
              return material ? { materials: [...current.materials, material] } : {};
            })
          }
        >
          Add
        </button>
      </div>
      {config.materials.map((material) => {
        const liveMaterial = live.materials.find((item) => item.id === material.id) ?? material;
        return (
          <article key={material.id} className="dash__item">
            <div className="dash__item-head">
              <input
                className="dash__input dash__text"
                type="text"
                maxLength={32}
                defaultValue={material.name}
                onBlur={(event) =>
                  patchFrom((current) => ({
                    materials: current.materials.map((item) =>
                      item.id === material.id ? { ...item, name: event.target.value } : item,
                    ),
                  }))
                }
              />
              <button
                type="button"
                className="dash__btn"
                disabled={config.materials.length <= MIN_MATERIALS}
                onClick={() =>
                  patchFrom((current) => {
                    if (current.materials.length <= MIN_MATERIALS) {
                      return {};
                    }
                    const materials = current.materials.filter((item) => item.id !== material.id);
                    const fallback = materials[0]?.id ?? material.id;
                    const emitters = current.emitters.map((emitter) =>
                      emitter.materialId === material.id ? { ...emitter, materialId: fallback } : emitter,
                    );
                    return { materials, emitters };
                  })
                }
              >
                Remove
              </button>
            </div>
            <ToggleRow
              label="Enabled"
              value={material.enabled}
              onChange={(enabled) => patchMaterial(patchFrom, material.id, { enabled })}
            />
            <ColorRow
              label="Color"
              value={material.color}
              onChange={(color) => patchMaterial(patchFrom, material.id, { color })}
            />
            <ColorRow
              label="Color B"
              value={material.colorB}
              onChange={(colorB) => patchMaterial(patchFrom, material.id, { colorB })}
            />
            <MaterialRange
              material={material}
              liveMaterial={liveMaterial}
              config={config}
              field="viscosity"
              label="Viscosity"
              patchFrom={patchFrom}
            />
            <MaterialRange
              material={material}
              liveMaterial={liveMaterial}
              config={config}
              field="roughness"
              label="Roughness"
              patchFrom={patchFrom}
            />
            <MaterialRange
              material={material}
              liveMaterial={liveMaterial}
              config={config}
              field="metallic"
              label="Metallic"
              patchFrom={patchFrom}
            />
            <MaterialRange
              material={material}
              liveMaterial={liveMaterial}
              config={config}
              field="sheen"
              label="Sheen"
              patchFrom={patchFrom}
            />
            <MaterialRange
              material={material}
              liveMaterial={liveMaterial}
              config={config}
              field="glow"
              label="Glow"
              patchFrom={patchFrom}
            />
          </article>
        );
      })}
    </section>
  );
}

function patchMaterial(
  patchFrom: (builder: (current: FluidConfig) => Partial<FluidConfig>) => FluidConfig,
  id: string,
  patch: Partial<FluidMaterial>,
): void {
  patchFrom((current) => ({
    materials: current.materials.map((item) => (item.id === id ? { ...item, ...patch } : item)),
  }));
}

function MaterialRange({
  material,
  liveMaterial,
  config,
  field,
  label,
  patchFrom,
}: {
  material: FluidMaterial;
  liveMaterial: FluidMaterial;
  config: FluidConfig;
  field: "viscosity" | "roughness" | "metallic" | "sheen" | "glow";
  label: string;
  patchFrom: (builder: (current: FluidConfig) => Partial<FluidConfig>) => FluidConfig;
}): ReactNode {
  const path = `materials.${material.id}.${field}`;
  return (
    <RangeRow
      label={label}
      value={material[field]}
      live={liveMaterial[field]}
      min={0}
      max={1}
      step={0.01}
      driverName={driverNameForPath(config, path)}
      onChange={(value) => patchMaterial(patchFrom, material.id, { [field]: value })}
    />
  );
}

function EmittersTab({
  config,
  live,
  patchFrom,
}: {
  config: FluidConfig;
  live: FluidConfig;
  patchFrom: (builder: (current: FluidConfig) => Partial<FluidConfig>, reseed?: boolean) => FluidConfig;
}): ReactNode {
  return (
    <section className="dash__group">
      <div className="dash__group-head">
        <h3 className="dash__group-title">Emitters</h3>
        <button
          type="button"
          className="dash__btn"
          disabled={config.emitters.length >= MAX_EMITTERS}
          onClick={() =>
            patchFrom((current) => {
              const emitter = createEmitter(current.emitters, current.materials);
              return emitter ? { emitters: [...current.emitters, emitter] } : {};
            })
          }
        >
          Add
        </button>
      </div>
      {config.emitters.map((emitter) => {
        const liveEmitter = live.emitters.find((item) => item.id === emitter.id) ?? emitter;
        return (
          <article key={emitter.id} className="dash__item">
            <div className="dash__item-head">
              <input
                className="dash__input dash__text"
                type="text"
                maxLength={32}
                defaultValue={emitter.name}
                onBlur={(event) =>
                  patchFrom((current) => ({
                    emitters: current.emitters.map((item) =>
                      item.id === emitter.id ? { ...item, name: event.target.value } : item,
                    ),
                  }))
                }
              />
              <button
                type="button"
                className="dash__btn"
                onClick={() =>
                  patchFrom((current) => ({
                    emitters: current.emitters.filter((item) => item.id !== emitter.id),
                  }))
                }
              >
                Remove
              </button>
            </div>
            <ToggleRow
              label="Enabled"
              value={emitter.enabled}
              onChange={(enabled) => patchEmitter(patchFrom, emitter.id, { enabled })}
            />
            <SelectRow
              label="Kind"
              value={emitter.kind}
              options={[
                { value: "field", label: "Field" },
                { value: "point", label: "Point" },
                { value: "pointer", label: "Pointer" },
              ]}
              onChange={(kind) => patchEmitter(patchFrom, emitter.id, { kind: kind as EmitterKind })}
            />
            <SelectRow
              label="Material"
              value={emitter.materialId}
              options={config.materials.map((material) => ({ value: material.id, label: material.name }))}
              onChange={(materialId) => patchEmitter(patchFrom, emitter.id, { materialId })}
            />
            <EmitterRange
              emitter={emitter}
              liveEmitter={liveEmitter}
              config={config}
              field="rate"
              label="Rate"
              min={0}
              max={1}
              step={0.01}
              patchFrom={patchFrom}
            />
            {emitter.kind !== "field" ? (
              <EmitterRange
                emitter={emitter}
                liveEmitter={liveEmitter}
                config={config}
                field="radius"
                label="Radius"
                min={0.00005}
                max={0.25}
                step={0.00005}
                patchFrom={patchFrom}
              />
            ) : null}
            {emitter.kind === "point" ? (
              <>
                <EmitterRange
                  emitter={emitter}
                  liveEmitter={liveEmitter}
                  config={config}
                  field="uvX"
                  label="U"
                  min={0}
                  max={1}
                  step={0.01}
                  patchFrom={patchFrom}
                />
                <EmitterRange
                  emitter={emitter}
                  liveEmitter={liveEmitter}
                  config={config}
                  field="uvY"
                  label="V"
                  min={0}
                  max={1}
                  step={0.01}
                  patchFrom={patchFrom}
                />
              </>
            ) : null}
            {emitter.kind === "field" ? (
              <EmitterRange
                emitter={emitter}
                liveEmitter={liveEmitter}
                config={config}
                field="noiseOffset"
                label="Noise offset"
                min={0}
                max={1}
                step={0.01}
                patchFrom={patchFrom}
              />
            ) : null}
          </article>
        );
      })}
    </section>
  );
}

function patchEmitter(
  patchFrom: (builder: (current: FluidConfig) => Partial<FluidConfig>) => FluidConfig,
  id: string,
  patch: Partial<FluidEmitter>,
): void {
  patchFrom((current) => ({
    emitters: current.emitters.map((item) => (item.id === id ? { ...item, ...patch } : item)),
  }));
}

function EmitterRange({
  emitter,
  liveEmitter,
  config,
  field,
  label,
  min,
  max,
  step,
  patchFrom,
}: {
  emitter: FluidEmitter;
  liveEmitter: FluidEmitter;
  config: FluidConfig;
  field: "rate" | "radius" | "uvX" | "uvY" | "noiseOffset";
  label: string;
  min: number;
  max: number;
  step: number;
  patchFrom: (builder: (current: FluidConfig) => Partial<FluidConfig>) => FluidConfig;
}): ReactNode {
  const path = `emitters.${emitter.id}.${field}`;
  return (
    <RangeRow
      label={label}
      value={emitter[field]}
      live={liveEmitter[field]}
      min={min}
      max={max}
      step={step}
      driverName={driverNameForPath(config, path)}
      onChange={(value) => patchEmitter(patchFrom, emitter.id, { [field]: value })}
    />
  );
}

function WindTab({
  config,
  live,
  patchFrom,
}: {
  config: FluidConfig;
  live: FluidConfig;
  patchFrom: (builder: (current: FluidConfig) => Partial<FluidConfig>, reseed?: boolean) => FluidConfig;
}): ReactNode {
  return (
    <section className="dash__group">
      <div className="dash__group-head">
        <h3 className="dash__group-title">Wind</h3>
        <div className="dash__inline-actions" style={{ margin: 0 }}>
          <button type="button" className="dash__btn" onClick={() => patchFrom(() => ({ windStations: scatterWindStations(4) }))}>
            Scatter
          </button>
          <button
            type="button"
            className="dash__btn"
            disabled={config.windStations.length >= MAX_WIND_STATIONS}
            onClick={() =>
              patchFrom((current) => {
                const station = createWindStation(current.windStations);
                return station ? { windStations: [...current.windStations, station] } : {};
              })
            }
          >
            Add
          </button>
        </div>
      </div>
      <p className="dash__hint">2D stations like sparse wind data: heading/speed for stream, spin for vorticity. Live weather files stay later.</p>
      {config.windStations.map((station) => {
        const liveStation = live.windStations.find((item) => item.id === station.id) ?? station;
        return (
          <article key={station.id} className="dash__item">
            <div className="dash__item-head">
              <input
                className="dash__input dash__text"
                type="text"
                maxLength={32}
                defaultValue={station.name}
                onBlur={(event) =>
                  patchFrom((current) => ({
                    windStations: current.windStations.map((item) =>
                      item.id === station.id ? { ...item, name: event.target.value } : item,
                    ),
                  }))
                }
              />
              <button
                type="button"
                className="dash__btn"
                onClick={() =>
                  patchFrom((current) => ({
                    windStations: current.windStations.filter((item) => item.id !== station.id),
                  }))
                }
              >
                Remove
              </button>
            </div>
            <ToggleRow
              label="Enabled"
              value={station.enabled}
              onChange={(enabled) => patchWind(patchFrom, station.id, { enabled })}
            />
            <WindRange station={station} liveStation={liveStation} config={config} field="uvX" label="U" min={0} max={1} step={0.01} patchFrom={patchFrom} />
            <WindRange station={station} liveStation={liveStation} config={config} field="uvY" label="V" min={0} max={1} step={0.01} patchFrom={patchFrom} />
            <WindRange station={station} liveStation={liveStation} config={config} field="heading" label="Heading" min={0} max={1} step={0.01} patchFrom={patchFrom} />
            <WindRange station={station} liveStation={liveStation} config={config} field="speed" label="Speed" min={0} max={1} step={0.01} patchFrom={patchFrom} />
            <WindRange station={station} liveStation={liveStation} config={config} field="spin" label="Spin" min={-1} max={1} step={0.01} patchFrom={patchFrom} />
            <WindRange station={station} liveStation={liveStation} config={config} field="radius" label="Radius" min={0.04} max={0.45} step={0.01} patchFrom={patchFrom} />
          </article>
        );
      })}
    </section>
  );
}

function patchWind(
  patchFrom: (builder: (current: FluidConfig) => Partial<FluidConfig>) => FluidConfig,
  id: string,
  patch: Partial<WindStation>,
): void {
  patchFrom((current) => ({
    windStations: current.windStations.map((item) => (item.id === id ? { ...item, ...patch } : item)),
  }));
}

function WindRange({
  station,
  liveStation,
  config,
  field,
  label,
  min,
  max,
  step,
  patchFrom,
}: {
  station: WindStation;
  liveStation: WindStation;
  config: FluidConfig;
  field: "uvX" | "uvY" | "heading" | "speed" | "spin" | "radius";
  label: string;
  min: number;
  max: number;
  step: number;
  patchFrom: (builder: (current: FluidConfig) => Partial<FluidConfig>) => FluidConfig;
}): ReactNode {
  const path = `windStations.${station.id}.${field}`;
  return (
    <RangeRow
      label={label}
      value={station[field]}
      live={liveStation[field]}
      min={min}
      max={max}
      step={step}
      driverName={driverNameForPath(config, path)}
      onChange={(value) => patchWind(patchFrom, station.id, { [field]: value })}
    />
  );
}

function DriversTab({
  config,
  live,
  elapsed,
  patchFrom,
}: {
  config: FluidConfig;
  live: FluidConfig;
  elapsed: number;
  patchFrom: (builder: (current: FluidConfig) => Partial<FluidConfig>) => FluidConfig;
}): ReactNode {
  const paths = useMemo(() => BINDABLE_PATHS(config), [config]);
  const defaultPath = paths[0]?.path ?? "vorticity";
  return (
    <>
      <section className="dash__group">
        <div className="dash__group-head">
          <h3 className="dash__group-title">Value emitters</h3>
          <button
            type="button"
            className="dash__btn"
            disabled={config.valueEmitters.length >= MAX_VALUE_EMITTERS}
            onClick={() =>
              patchFrom((current) => {
                const emitter = createValueEmitter(current.valueEmitters);
                return emitter ? { valueEmitters: [...current.valueEmitters, emitter] } : {};
              })
            }
          >
            Add
          </button>
        </div>
        <p className="dash__hint">A sine wave is an A↔B tween. Mic, camera, and tilt sample 0.5 and request no permissions.</p>
        {config.valueEmitters.map((emitter) => {
          const sample = evaluateEmitter(emitter, elapsed);
          const preview = wave01(emitter.kind, elapsed * Math.max(0, emitter.rate) + emitter.phase);
          return (
            <article key={emitter.id} className="dash__item">
              <div className="dash__item-head">
                <input
                  className="dash__input dash__text"
                  type="text"
                  maxLength={32}
                  defaultValue={emitter.name}
                  onBlur={(event) =>
                    patchFrom((current) => ({
                      valueEmitters: current.valueEmitters.map((item) =>
                        item.id === emitter.id ? { ...item, name: event.target.value } : item,
                      ),
                    }))
                  }
                />
                <button
                  type="button"
                  className="dash__btn"
                  onClick={() =>
                    patchFrom((current) => ({
                      valueEmitters: current.valueEmitters.filter((item) => item.id !== emitter.id),
                    }))
                  }
                >
                  Remove
                </button>
              </div>
              <ToggleRow
                label="Enabled"
                value={emitter.enabled}
                onChange={(enabled) =>
                  patchFrom((current) => ({
                    valueEmitters: current.valueEmitters.map((item) =>
                      item.id === emitter.id ? { ...item, enabled } : item,
                    ),
                  }))
                }
              />
              <SelectRow
                label="Kind"
                value={emitter.kind}
                display={kindLabel(emitter.kind)}
                options={VALUE_EMITTER_KINDS.map((kind) => ({ value: kind, label: kindLabel(kind) }))}
                onChange={(kind) =>
                  patchFrom((current) => ({
                    valueEmitters: current.valueEmitters.map((item) =>
                      item.id === emitter.id ? { ...item, kind: kind as ValueEmitterKind } : item,
                    ),
                  }))
                }
              />
              <RangeRow
                label="Rate (Hz)"
                value={emitter.rate}
                min={0}
                max={8}
                step={0.01}
                onChange={(rate) =>
                  patchFrom((current) => ({
                    valueEmitters: current.valueEmitters.map((item) =>
                      item.id === emitter.id ? { ...item, rate } : item,
                    ),
                  }))
                }
              />
              <RangeRow
                label="Phase"
                value={emitter.phase}
                min={0}
                max={1}
                step={0.01}
                onChange={(phase) =>
                  patchFrom((current) => ({
                    valueEmitters: current.valueEmitters.map((item) =>
                      item.id === emitter.id ? { ...item, phase } : item,
                    ),
                  }))
                }
              />
              <RangeRow
                label="From"
                value={emitter.from}
                min={-40}
                max={40}
                step={0.01}
                onChange={(from) =>
                  patchFrom((current) => ({
                    valueEmitters: current.valueEmitters.map((item) =>
                      item.id === emitter.id ? { ...item, from } : item,
                    ),
                  }))
                }
              />
              <RangeRow
                label="To"
                value={emitter.to}
                min={-40}
                max={40}
                step={0.01}
                onChange={(to) =>
                  patchFrom((current) => ({
                    valueEmitters: current.valueEmitters.map((item) =>
                      item.id === emitter.id ? { ...item, to } : item,
                    ),
                  }))
                }
              />
              <div className="dash__row">
                <div className="dash__meta">
                  <span className="dash__label">Wave</span>
                  <span className="dash__value">{sample.toFixed(2)}</span>
                </div>
                <div className="dash__wave" aria-hidden="true">
                  <div className="dash__wave-fill" style={{ width: `${Math.min(100, Math.max(0, preview * 100))}%` }} />
                </div>
              </div>
            </article>
          );
        })}
      </section>
      <section className="dash__group">
        <div className="dash__group-head">
          <h3 className="dash__group-title">Bindings</h3>
          <button
            type="button"
            className="dash__btn"
            disabled={config.valueEmitters.length === 0 || config.valueBindings.length >= MAX_VALUE_BINDINGS}
            onClick={() =>
              patchFrom((current) => {
                const binding = createValueBinding(current, defaultPath);
                return binding ? { valueBindings: [...current.valueBindings, binding] } : {};
              })
            }
          >
            Add
          </button>
        </div>
        {config.valueBindings.map((binding) => {
          const liveValue = getPath(live, binding.path);
          const pathLabel = paths.find((item) => item.path === binding.path)?.label ?? binding.path;
          return (
            <article key={binding.id} className="dash__item">
              <div className="dash__item-head">
                <span className="dash__chip">{pathLabel}</span>
                <button
                  type="button"
                  className="dash__btn"
                  onClick={() =>
                    patchFrom((current) => ({
                      valueBindings: current.valueBindings.filter((item) => item.id !== binding.id),
                    }))
                  }
                >
                  Remove
                </button>
              </div>
              <SelectRow
                label="Emitter"
                value={binding.emitterId}
                options={config.valueEmitters.map((emitter) => ({ value: emitter.id, label: emitter.name }))}
                onChange={(emitterId) =>
                  patchFrom((current) => ({
                    valueBindings: current.valueBindings.map((item) =>
                      item.id === binding.id ? { ...item, emitterId } : item,
                    ),
                  }))
                }
              />
              <SelectRow
                label="Target"
                value={binding.path}
                display={pathLabel}
                options={paths.map((item) => ({ value: item.path, label: item.label }))}
                onChange={(path) =>
                  patchFrom((current) => ({
                    valueBindings: current.valueBindings.map((item) =>
                      item.id === binding.id ? { ...item, path } : item,
                    ),
                  }))
                }
              />
              <RangeRow
                label="Amount"
                value={binding.amount}
                live={liveValue}
                min={0}
                max={1}
                step={0.01}
                driverName={config.valueEmitters.find((emitter) => emitter.id === binding.emitterId)?.name}
                onChange={(amount) =>
                  patchFrom((current) => ({
                    valueBindings: current.valueBindings.map((item) =>
                      item.id === binding.id ? { ...item, amount } : item,
                    ),
                  }))
                }
              />
            </article>
          );
        })}
      </section>
    </>
  );
}

function PresetsTab({
  engine,
  setConfig,
}: {
  engine: Engine;
  setConfig: (config: FluidConfig) => void;
}): ReactNode {
  const [name, setName] = useState("");
  const [presets, setPresets] = useState<FluidPreset[]>(() => loadPresets());
  const [selectedId, setSelectedId] = useState(presets[0]?.id ?? "");

  const refresh = (id?: string): void => {
    const next = loadPresets();
    setPresets(next);
    const pick = id && next.some((preset) => preset.id === id) ? id : next[0]?.id ?? "";
    setSelectedId(pick);
  };

  return (
    <section className="dash__group">
      <h3 className="dash__group-title">Presets</h3>
      <p className="dash__hint">Saves base config, including the driver graph. Load reseeds the solver.</p>
      <label className="dash__row">
        <span className="dash__label">Name</span>
        <input
          className="dash__input dash__text"
          type="text"
          maxLength={48}
          placeholder="Preset name"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </label>
      <label className="dash__row">
        <span className="dash__label">Saved</span>
        <select
          className="dash__input dash__select"
          value={selectedId}
          disabled={presets.length === 0}
          onChange={(event) => setSelectedId(event.target.value)}
        >
          {presets.length === 0 ? <option value="">No presets yet</option> : null}
          {presets.map((preset) => (
            <option key={preset.id} value={preset.id}>
              {preset.name}
            </option>
          ))}
        </select>
      </label>
      <div className="dash__preset-actions">
        <button
          type="button"
          className="dash__btn"
          onClick={() => {
            try {
              const preset = upsertPreset(name, engine.getConfig());
              setName(preset.name);
              refresh(preset.id);
            } catch (error) {
              console.warn(error instanceof Error ? error.message : error);
            }
          }}
        >
          Save
        </button>
        <button
          type="button"
          className="dash__btn"
          disabled={!selectedId}
          onClick={() => {
            const preset = presets.find((item) => item.id === selectedId);
            if (!preset) {
              refresh();
              return;
            }
            const next = engine.applyConfig(cloneConfig(preset.config));
            saveStoredConfig(next);
            engine.reseed();
            setConfig(next);
            setName(preset.name);
            refresh(preset.id);
          }}
        >
          Load
        </button>
        <button
          type="button"
          className="dash__btn"
          disabled={!selectedId}
          onClick={() => {
            if (!selectedId) {
              return;
            }
            deletePreset(selectedId);
            refresh();
          }}
        >
          Delete
        </button>
      </div>
    </section>
  );
}

export function mountDashboard(engine: Engine, root: HTMLElement): () => void {
  root.hidden = false;
  let reactRoot: Root | null = createRoot(root);
  reactRoot.render(<Dashboard engine={engine} />);
  return () => {
    reactRoot?.unmount();
    reactRoot = null;
    root.replaceChildren();
  };
}
