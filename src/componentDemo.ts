import { defineFluidInk, defaultLiquidScene, type FluidInkElement } from "../package-dist/element.js";

const status = document.querySelector<HTMLOutputElement>("#status")!;
const field = document.querySelector<FluidInkElement>("#field")!;
for (const event of ["ready", "error", "configchange", "qualitychange"]) {
  field.addEventListener(event, () => { status.textContent = event === "error" ? "WebGL initialization failed; fallback shown." : event; });
}
defineFluidInk();
document.querySelector("#play")!.addEventListener("click", () => field.play());
document.querySelector("#pause")!.addEventListener("click", () => field.pause());
document.querySelector("#reset")!.addEventListener("click", () => field.reset());
document.querySelector("#inject")!.addEventListener("click", () => field.inject({ position: { x: .5, y: .5 }, velocity: { x: .15, y: .1 } }));
document.querySelector<HTMLSelectElement>("#quality")!.addEventListener("change", event => field.setAttribute("quality", (event.target as HTMLSelectElement).value));
document.querySelector<HTMLInputElement>("#swirl")!.addEventListener("input", event => field.setConfig({ vorticity: Number((event.target as HTMLInputElement).value) }));
document.querySelector("#experimental")!.addEventListener("click", () => {
  const host = document.querySelector("#experiment")!;
  if (host.childElementCount) return;
  const liquid = document.createElement("fluid-ink") as FluidInkElement;
  liquid.setAttribute("paused", "");
  liquid.style.height = "300px";
  liquid.scene = defaultLiquidScene();
  host.append(liquid);
});
