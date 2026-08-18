import { useCallback, type ReactNode } from "react";
import {
  MAX_MATERIALS,
  MIN_MATERIALS,
  createMaterial,
  type FluidConfig,
  type FluidMaterial,
} from "../../app/config";
import { MATERIAL_FIELD_HELP } from "../../app/fieldHelp";
import { driverNameForPath } from "../../app/drivers";
import { duplicateById } from "../duplicateItem";
import { ItemCard } from "../ItemCard";
import { ColorRow, RangeRow, ToggleRow } from "../rows";
import type { PatchFrom } from "../types";
import { useCollapsedIds } from "../useCollapsedIds";

export function MaterialsTab({
  config,
  live,
  patchFrom,
}: {
  config: FluidConfig;
  live: FluidConfig;
  patchFrom: PatchFrom;
}): ReactNode {
  const collapsed = useCollapsedIds();
  const duplicate = useCallback(
    (id: string) => {
      patchFrom((current) => {
        const next = duplicateById(current.materials, id, "mat", MAX_MATERIALS);
        return next ? { materials: next.items } : {};
      });
    },
    [patchFrom],
  );
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
          <ItemCard
            key={material.id}
            collapsed={collapsed.isCollapsed(material.id)}
            canDuplicate={config.materials.length < MAX_MATERIALS}
            removeDisabled={config.materials.length <= MIN_MATERIALS}
            onToggleCollapse={() => collapsed.toggle(material.id)}
            onDuplicate={() => duplicate(material.id)}
            onRemove={() =>
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
            nameSlot={
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
            }
          >
            <ToggleRow
              label="Enabled"
              help={MATERIAL_FIELD_HELP.enabled}
              value={material.enabled}
              onChange={(enabled) => patchMaterial(patchFrom, material.id, { enabled })}
            />
            <ColorRow
              label="Color"
              help={MATERIAL_FIELD_HELP.color}
              value={material.color}
              onChange={(color) => patchMaterial(patchFrom, material.id, { color })}
            />
            <ColorRow
              label="Color B"
              help={MATERIAL_FIELD_HELP.colorB}
              value={material.colorB}
              onChange={(colorB) => patchMaterial(patchFrom, material.id, { colorB })}
            />
            <MaterialRange
              material={material}
              liveMaterial={liveMaterial}
              config={config}
              field="viscosity"
              label="Viscosity"
              help={MATERIAL_FIELD_HELP.viscosity}
              patchFrom={patchFrom}
            />
            <MaterialRange
              material={material}
              liveMaterial={liveMaterial}
              config={config}
              field="roughness"
              label="Roughness"
              help={MATERIAL_FIELD_HELP.roughness}
              patchFrom={patchFrom}
            />
            <MaterialRange
              material={material}
              liveMaterial={liveMaterial}
              config={config}
              field="metallic"
              label="Metallic"
              help={MATERIAL_FIELD_HELP.metallic}
              patchFrom={patchFrom}
            />
            <MaterialRange
              material={material}
              liveMaterial={liveMaterial}
              config={config}
              field="sheen"
              label="Sheen"
              help={MATERIAL_FIELD_HELP.sheen}
              patchFrom={patchFrom}
            />
            <MaterialRange
              material={material}
              liveMaterial={liveMaterial}
              config={config}
              field="glow"
              label="Glow"
              help={MATERIAL_FIELD_HELP.glow}
              patchFrom={patchFrom}
            />
          </ItemCard>
        );
      })}
    </section>
  );
}

function patchMaterial(patchFrom: PatchFrom, id: string, patch: Partial<FluidMaterial>): void {
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
  help,
  patchFrom,
}: {
  material: FluidMaterial;
  liveMaterial: FluidMaterial;
  config: FluidConfig;
  field: "viscosity" | "roughness" | "metallic" | "sheen" | "glow";
  label: string;
  help: string;
  patchFrom: PatchFrom;
}): ReactNode {
  const path = `materials.${material.id}.${field}`;
  return (
    <RangeRow
      label={label}
      help={help}
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
