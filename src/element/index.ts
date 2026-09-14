export { FluidInkElement } from "./FluidInkElement";
export type { FluidInkInjection, FluidInkQuality } from "./FluidInkElement";
export { defaultLiquidScene, validateLiquidScene } from "../app/liquidScene";
export type { LiquidScene, Pigment } from "../app/liquidScene";
export type { LiquidStatus } from "../app/liquidEngine";
export type { EcoStatus } from "../app/engine";
import { FluidInkElement } from "./FluidInkElement";

export function defineFluidInk(tagName = "fluid-ink"): void {
  if (typeof customElements === "undefined" || customElements.get(tagName)) {
    return;
  }
  customElements.define(tagName, FluidInkElement);
}
