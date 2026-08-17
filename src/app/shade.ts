import type { LiveMaterial } from "./colorTween";
import {
  clamp01,
  dot3,
  luma,
  mixNumber,
  mixRgb,
  normalize3,
  smoothstep,
  type Rgb,
} from "./palette";

export const LIGHT_DIR: [number, number, number] = normalize3([0.35, 0.6, 0.85]);
export const VIEW_DIR: [number, number, number] = [0, 0, 1];

export type MixedLook = {
  albedo: Rgb;
  roughness: number;
  metallic: number;
  sheen: number;
  glow: number;
  height: number;
};

export type Conc4 = readonly [number, number, number, number];

function contrastPower(contrast: number): number {
  const contrastT = clamp01((contrast - 0.4) / 2.6);
  return mixNumber(1, 4, contrastT);
}

export function mixLooks(conc: Conc4, slots: readonly LiveMaterial[], contrast: number): MixedLook {
  const power = contrastPower(contrast);
  const weights: number[] = [0, 0, 0, 0];
  let height = 0;
  for (let i = 0; i < 4; i += 1) {
    const slot = slots[i];
    const amount = Math.max(0, conc[i] ?? 0) * (slot?.enabled ? 1 : 0);
    height += amount;
    weights[i] = amount > 0 ? amount ** power : 0;
  }
  const weightSum = weights[0] + weights[1] + weights[2] + weights[3];
  if (weightSum <= 1e-6 || !slots[0]) {
    return {
      albedo: [0, 0, 0],
      roughness: 0.5,
      metallic: 0,
      sheen: 0,
      glow: 0,
      height,
    };
  }
  let albedo: Rgb = [0, 0, 0];
  let roughness = 0;
  let metallic = 0;
  let sheen = 0;
  let glow = 0;
  for (let i = 0; i < 4; i += 1) {
    const slot = slots[i];
    const w = (weights[i] ?? 0) / weightSum;
    if (!slot || w <= 0) {
      continue;
    }
    albedo = [
      albedo[0] + slot.albedo[0] * w,
      albedo[1] + slot.albedo[1] * w,
      albedo[2] + slot.albedo[2] * w,
    ];
    roughness += slot.roughness * w;
    metallic += slot.metallic * w;
    sheen += slot.sheen * w;
    glow += slot.glow * w;
  }
  return { albedo, roughness, metallic, sheen, glow, height };
}

export function heightNormal(
  height: number,
  heightX: number,
  heightY: number,
  scale = 4,
): [number, number, number] {
  return normalize3([(height - heightX) * scale, (height - heightY) * scale, 1]);
}

export function shadeLook(mixed: MixedLook, normal: readonly [number, number, number]): Rgb {
  const n = normalize3(normal);
  const l = LIGHT_DIR;
  const v = VIEW_DIR;
  const nDotL = Math.max(dot3(n, l), 0);
  const h = normalize3([l[0] + v[0], l[1] + v[1], l[2] + v[2]]);
  const nDotH = Math.max(dot3(n, h), 0);
  const nDotV = Math.max(dot3(n, v), 0);
  const specPower = mixNumber(8, 128, 1 - clamp01(mixed.roughness));
  const spec = nDotH ** specPower * mixNumber(0.04, 1, clamp01(mixed.metallic)) * nDotL;
  const fresnel = (1 - nDotV) ** 5;
  const diffuse = 0.18 + 0.82 * nDotL;
  const sheen = mixed.albedo.map((c) => c * mixed.sheen * fresnel) as Rgb;
  const emissive = mixed.albedo.map((c) => c * mixed.glow * 0.55) as Rgb;
  const overshoot = Math.max(mixed.height - 1, 0);
  const bloom = (1 - Math.exp(-overshoot * 1.85)) * mixed.glow;
  const color: Rgb = [
    mixed.albedo[0] * diffuse + spec + sheen[0] + emissive[0] + mixed.albedo[0] * bloom * 0.45,
    mixed.albedo[1] * diffuse + spec + sheen[1] + emissive[1] + mixed.albedo[1] * bloom * 0.45,
    mixed.albedo[2] * diffuse + spec + sheen[2] + emissive[2] + mixed.albedo[2] * bloom * 0.45,
  ];
  return [clamp01(color[0]), clamp01(color[1]), clamp01(color[2])];
}

export function viscosityExtra(conc: Conc4, slots: readonly LiveMaterial[]): number {
  let extra = 0;
  for (let i = 0; i < 4; i += 1) {
    const slot = slots[i];
    if (!slot?.enabled) {
      continue;
    }
    extra += Math.max(0, conc[i] ?? 0) * slot.viscosity;
  }
  return extra;
}

export function viscosityDamp(conc: Conc4, slots: readonly LiveMaterial[], baseDecay: number, dt: number): number {
  return Math.exp(-(Math.max(0, baseDecay) + viscosityExtra(conc, slots)) * Math.max(0, dt));
}

export function shadeStatsLuma(color: Rgb): number {
  return luma(color);
}

export { mixRgb, mixNumber, smoothstep };
