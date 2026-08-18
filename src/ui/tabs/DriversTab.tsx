import { useMemo, type ReactNode } from "react";
import {
  MAX_VALUE_EMITTERS,
  VALUE_EMITTER_KINDS,
  createValueEmitter,
  type FluidConfig,
  type ValueEmitter,
  type ValueEmitterKind,
} from "../../app/config";
import { VALUE_EMITTER_FIELD_HELP } from "../../app/fieldHelp";
import { evaluateEmitter, getPath, wave01 } from "../../app/drivers";
import { connectPorts, latestBindings, removeBinding } from "../graph/connect";
import { DriverGraph } from "../graph/DriverGraph";
import { kindLabel } from "../driverLabels";
import { RangeRow, SelectRow, ToggleRow } from "../rows";
import type { PatchFrom } from "../types";

export function DriversTab({
  config,
  live,
  elapsed,
  selectedEmitterId,
  selectedBindingId,
  onSelectEmitter,
  onSelectBinding,
  patchFrom,
}: {
  config: FluidConfig;
  live: FluidConfig;
  elapsed: number;
  selectedEmitterId: string | null;
  selectedBindingId: string | null;
  onSelectEmitter: (id: string | null) => void;
  onSelectBinding: (id: string | null) => void;
  patchFrom: PatchFrom;
}): ReactNode {
  const emitter =
    config.valueEmitters.find((item) => item.id === selectedEmitterId) ?? config.valueEmitters[0] ?? null;
  const connected = useMemo(
    () => (emitter ? latestBindings(config.valueBindings).filter((binding) => binding.emitterId === emitter.id) : []),
    [config.valueBindings, emitter],
  );

  return (
    <div className="dash__drivers">
      <section className="dash__group dash__drivers-graph">
        <h3 className="dash__group-title">Graph</h3>
        <p className="dash__hint">Drag from an emitter port to a target. Click a wire, then Delete to drop it.</p>
        <DriverGraph
          config={config}
          selectedEmitterId={emitter?.id ?? null}
          selectedBindingId={selectedBindingId}
          onSelectEmitter={onSelectEmitter}
          onSelectBinding={onSelectBinding}
          onConnect={(emitterId, path) =>
            patchFrom((current) => {
              const next = connectPorts(current, emitterId, path);
              return next ? { valueBindings: next } : {};
            })
          }
          onRemoveBinding={(id) =>
            patchFrom((current) => ({
              valueBindings: removeBinding(current.valueBindings, id),
            }))
          }
        />
      </section>
      <section className="dash__group">
        <div className="dash__group-head">
          <h3 className="dash__group-title">Inspector</h3>
          <button
            type="button"
            className="dash__btn"
            disabled={config.valueEmitters.length >= MAX_VALUE_EMITTERS}
            onClick={() =>
              patchFrom((current) => {
                const created = createValueEmitter(current.valueEmitters);
                if (!created) {
                  return {};
                }
                onSelectEmitter(created.id);
                return { valueEmitters: [...current.valueEmitters, created] };
              })
            }
          >
            Add
          </button>
        </div>
        <p className="dash__hint">A sine wave is an A↔B tween. Mic, camera, and tilt sample 0.5 and request no permissions.</p>
        {emitter ? (
          <EmitterInspector
            emitter={emitter}
            live={live}
            elapsed={elapsed}
            connected={connected}
            patchFrom={patchFrom}
            onRemove={() =>
              patchFrom((current) => {
                const valueEmitters = current.valueEmitters.filter((item) => item.id !== emitter.id);
                onSelectEmitter(valueEmitters[0]?.id ?? null);
                return {
                  valueEmitters,
                  valueBindings: current.valueBindings.filter((binding) => binding.emitterId !== emitter.id),
                };
              })
            }
            onPatch={(patch) =>
              patchFrom((current) => ({
                valueEmitters: current.valueEmitters.map((item) =>
                  item.id === emitter.id ? { ...item, ...patch } : item,
                ),
              }))
            }
            onAmount={(bindingId, amount) =>
              patchFrom((current) => ({
                valueBindings: current.valueBindings.map((item) =>
                  item.id === bindingId ? { ...item, amount } : item,
                ),
              }))
            }
            onDropBinding={(id) =>
              patchFrom((current) => ({
                valueBindings: removeBinding(current.valueBindings, id),
              }))
            }
          />
        ) : (
          <p className="dash__hint">Add a value emitter to start wiring knobs.</p>
        )}
      </section>
    </div>
  );
}

function EmitterInspector({
  emitter,
  live,
  elapsed,
  connected,
  patchFrom,
  onRemove,
  onPatch,
  onAmount,
  onDropBinding,
}: {
  emitter: ValueEmitter;
  live: FluidConfig;
  elapsed: number;
  connected: ReturnType<typeof latestBindings>;
  patchFrom: PatchFrom;
  onRemove: () => void;
  onPatch: (patch: Partial<ValueEmitter>) => void;
  onAmount: (id: string, amount: number) => void;
  onDropBinding: (id: string) => void;
}): ReactNode {
  const sample = evaluateEmitter(emitter, elapsed);
  const preview = wave01(emitter.kind, elapsed * Math.max(0, emitter.rate) + emitter.phase);
  return (
    <article className="dash__item">
      <div className="dash__item-head">
        <input
          className="dash__input dash__text"
          type="text"
          maxLength={32}
          defaultValue={emitter.name}
          key={emitter.id}
          onBlur={(event) =>
            patchFrom((current) => ({
              valueEmitters: current.valueEmitters.map((item) =>
                item.id === emitter.id ? { ...item, name: event.target.value } : item,
              ),
            }))
          }
        />
        <button type="button" className="dash__btn" onClick={onRemove}>
          Remove
        </button>
      </div>
      <ToggleRow
        label="Enabled"
        help={VALUE_EMITTER_FIELD_HELP.enabled}
        value={emitter.enabled}
        onChange={(enabled) => onPatch({ enabled })}
      />
      <SelectRow
        label="Kind"
        help={VALUE_EMITTER_FIELD_HELP.kind}
        value={emitter.kind}
        display={kindLabel(emitter.kind)}
        options={VALUE_EMITTER_KINDS.map((kind) => ({ value: kind, label: kindLabel(kind) }))}
        onChange={(kind) => onPatch({ kind: kind as ValueEmitterKind })}
      />
      <RangeRow
        label="Rate (Hz)"
        help={VALUE_EMITTER_FIELD_HELP.rate}
        value={emitter.rate}
        min={0}
        max={8}
        step={0.01}
        onChange={(rate) => onPatch({ rate })}
      />
      <RangeRow
        label="Phase"
        help={VALUE_EMITTER_FIELD_HELP.phase}
        value={emitter.phase}
        min={0}
        max={1}
        step={0.01}
        onChange={(phase) => onPatch({ phase })}
      />
      <RangeRow
        label="From"
        help={VALUE_EMITTER_FIELD_HELP.from}
        value={emitter.from}
        min={-40}
        max={40}
        step={0.01}
        onChange={(from) => onPatch({ from })}
      />
      <RangeRow
        label="To"
        help={VALUE_EMITTER_FIELD_HELP.to}
        value={emitter.to}
        min={-40}
        max={40}
        step={0.01}
        onChange={(to) => onPatch({ to })}
      />
      <RangeRow
        label="Scale"
        help={VALUE_EMITTER_FIELD_HELP.scale}
        value={emitter.scale}
        min={0}
        max={4}
        step={0.01}
        onChange={(scale) => onPatch({ scale })}
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
      {connected.map((binding) => {
        const liveValue = getPath(live, binding.path);
        return (
          <div key={binding.id} className="dash__binding">
            <RangeRow
              label={binding.path}
              help={VALUE_EMITTER_FIELD_HELP.amount}
              value={binding.amount}
              live={liveValue}
              min={0}
              max={1}
              step={0.01}
              driverName={emitter.name}
              onChange={(amount) => onAmount(binding.id, amount)}
            />
            <button type="button" className="dash__btn" onClick={() => onDropBinding(binding.id)}>
              Remove
            </button>
          </div>
        );
      })}
    </article>
  );
}
