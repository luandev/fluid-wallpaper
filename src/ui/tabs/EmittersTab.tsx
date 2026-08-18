import { type ReactNode } from "react";
import {
  MAX_EMITTERS,
  createEmitter,
  type EmitterKind,
  type FluidConfig,
  type FluidEmitter,
} from "../../app/config";
import { EMITTER_FIELD_HELP } from "../../app/fieldHelp";
import { driverNameForPath } from "../../app/drivers";
import { duplicateById } from "../duplicateItem";
import { ItemCard } from "../ItemCard";
import { RangeRow, SelectRow, ToggleRow } from "../rows";
import type { PatchFrom } from "../types";
import { useCollapsedIds } from "../useCollapsedIds";

export function EmittersTab({
  config,
  live,
  selectedId,
  onSelect,
  patchFrom,
}: {
  config: FluidConfig;
  live: FluidConfig;
  selectedId: string | null;
  onSelect: (id: string) => void;
  patchFrom: PatchFrom;
}): ReactNode {
  const collapsed = useCollapsedIds();
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
          <ItemCard
            key={emitter.id}
            selected={selectedId === emitter.id}
            collapsed={collapsed.isCollapsed(emitter.id)}
            canDuplicate={config.emitters.length < MAX_EMITTERS}
            onToggleCollapse={() => collapsed.toggle(emitter.id)}
            onSelect={() => onSelect(emitter.id)}
            onDuplicate={() =>
              patchFrom((current) => {
                const next = duplicateById(current.emitters, emitter.id, "emit", MAX_EMITTERS);
                if (!next) {
                  return {};
                }
                onSelect(next.copy.id);
                return { emitters: next.items };
              })
            }
            onRemove={() =>
              patchFrom((current) => ({
                emitters: current.emitters.filter((item) => item.id !== emitter.id),
              }))
            }
            nameSlot={
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
            }
          >
            <ToggleRow
              label="Enabled"
              help={EMITTER_FIELD_HELP.enabled}
              value={emitter.enabled}
              onChange={(enabled) => patchEmitter(patchFrom, emitter.id, { enabled })}
            />
            <SelectRow
              label="Kind"
              help={EMITTER_FIELD_HELP.kind}
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
              help={EMITTER_FIELD_HELP.material}
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
              help={EMITTER_FIELD_HELP.rate}
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
                help={EMITTER_FIELD_HELP.radius}
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
                  help={EMITTER_FIELD_HELP.uvX}
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
                  help={EMITTER_FIELD_HELP.uvY}
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
                help={EMITTER_FIELD_HELP.noiseOffset}
                min={0}
                max={1}
                step={0.01}
                patchFrom={patchFrom}
              />
            ) : null}
          </ItemCard>
        );
      })}
    </section>
  );
}

function patchEmitter(patchFrom: PatchFrom, id: string, patch: Partial<FluidEmitter>): void {
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
  help,
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
  help: string;
  min: number;
  max: number;
  step: number;
  patchFrom: PatchFrom;
}): ReactNode {
  const path = `emitters.${emitter.id}.${field}`;
  return (
    <RangeRow
      label={label}
      help={help}
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
