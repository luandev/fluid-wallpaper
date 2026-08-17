import { hexToRgb } from "./colors";
import type { FluidConfig, FluidMaterial } from "./config";
import { mixRgb, type Rgb } from "./palette";

export type LiveMaterial = {
  id: string;
  enabled: boolean;
  albedo: Rgb;
  viscosity: number;
  roughness: number;
  metallic: number;
  sheen: number;
  glow: number;
};

export type LiveMaterials = {
  slots: LiveMaterial[];
  t: number;
};

/** Ping-pong triangle in [0,1]. Period 2: 0→1→0. */
export function triangleWave(phase: number): number {
  if (!Number.isFinite(phase)) {
    return 0;
  }
  const period = ((phase % 2) + 2) % 2;
  return period <= 1 ? period : 2 - period;
}

export function tweenAmount(elapsed: number, speed: number): number {
  if (speed <= 0) {
    return 0;
  }
  return triangleWave(elapsed * speed);
}

export function tweenMaterial(material: FluidMaterial, t: number): LiveMaterial {
  return {
    id: material.id,
    enabled: material.enabled,
    albedo: mixRgb(hexToRgb(material.color), hexToRgb(material.colorB), t),
    viscosity: material.viscosity,
    roughness: material.roughness,
    metallic: material.metallic,
    sheen: material.sheen,
    glow: material.glow,
  };
}

export function padLiveMaterials(slots: readonly LiveMaterial[]): LiveMaterial[] {
  const next = slots.slice(0, 4);
  while (next.length < 4) {
    next.push({
      id: `mat-empty-${next.length}`,
      enabled: false,
      albedo: [0, 0, 0],
      viscosity: 0,
      roughness: 0.5,
      metallic: 0,
      sheen: 0,
      glow: 0,
    });
  }
  return next;
}

export function tweenMaterials(config: FluidConfig, elapsed: number): LiveMaterials {
  const t = tweenAmount(elapsed, config.colorTweenSpeed);
  return {
    slots: config.materials.map((material) => tweenMaterial(material, t)),
    t,
  };
}

