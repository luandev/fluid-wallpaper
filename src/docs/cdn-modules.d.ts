/** Ambient value modules for the pinned published CDN entries used by docs/examples. */
declare module "https://cdn.jsdelivr.net/npm/fluid-wallpaper@0.1.0-next.0/hero.js" {
  export function defineFluidHero(): void;
}
declare module "https://cdn.jsdelivr.net/npm/fluid-wallpaper@0.1.0-next.0/presets.js" {
  import type { FluidConfig } from "../app/config";
  import type { FluidPresetInfo } from "../presets";
  import type { PresetDocument } from "../app/presets";
  export const fluidPresets: readonly Readonly<FluidPresetInfo>[];
  export function getFluidPreset(id: string): FluidConfig;
  export function getFluidPresetDocument(id: string): PresetDocument;
}
declare module "https://cdn.jsdelivr.net/npm/fluid-wallpaper@0.1.0-next.0/element.js" {
  export function defineFluidInk(tagName?: string): void;
  export function defaultLiquidScene(): import("../app/liquidScene").LiquidScene;
}
