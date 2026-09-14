import type { LiquidScene, LinearRgb } from "../app/liquidScene";
export const srgbToLinear = (c: number): number => c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
export const linearToSrgb = (c: number): number => c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;
/** Opaque substrate composite; RGB coefficients are artistic, not spectral chemistry. */
export function absorptionColor(scene: LiquidScene, phase: number, pigment: readonly number[]): LinearRgb {
  return scene.substrate.map((s, c) => {
    let coefficient = phase * scene.phases[0].absorption[c] + (1 - phase) * scene.phases[1].absorption[c];
    scene.pigments.forEach((p, i) => { coefficient += Math.max(0, pigment[i] ?? 0) * p.absorption[c]; });
    return linearToSrgb(srgbToLinear(s) * Math.exp(-scene.opticalPath * scene.absorption * coefficient));
  }) as LinearRgb;
}
