import {
  defineFluidInk,
  defaultLiquidScene,
  type FluidInkElement,
  type EcoStatus,
} from "../package-dist/element.js";

const status = document.querySelector<HTMLOutputElement>("#status")!;
const field = document.querySelector<FluidInkElement>("#field")!;
for (const event of ["ready", "error", "configchange", "qualitychange"]) {
  field.addEventListener(event, (e) => {
    const detail = (e as CustomEvent<EcoStatus>).detail;
    status.textContent =
      event === "error"
        ? "WebGL initialization failed; fallback shown."
        : event === "qualitychange" && detail?.quality === "eco"
          ? `ECO: ${detail.simulation.join(" × ")} simulation · ${detail.targetFps} fps target · ${Math.round(detail.simulationSpeed * 100)}% speed. ${detail.reason}`
          : event;
  });
}
defineFluidInk();
document.querySelector("#play")!.addEventListener("click", () => field.play());
document
  .querySelector("#pause")!
  .addEventListener("click", () => field.pause());
document
  .querySelector("#reset")!
  .addEventListener("click", () => field.reset());
document.querySelector("#inject")!.addEventListener("click", () =>
  field.inject({
    position: { x: 0.5, y: 0.5 },
    velocity: { x: 0.15, y: 0.1 },
  }),
);
document
  .querySelector<HTMLSelectElement>("#quality")!
  .addEventListener("change", (event) =>
    field.setAttribute("quality", (event.target as HTMLSelectElement).value),
  );
document
  .querySelector<HTMLInputElement>("#swirl")!
  .addEventListener("input", (event) =>
    field.setConfig({
      vorticity: Number((event.target as HTMLInputElement).value),
    }),
  );
document.querySelector("#experimental")!.addEventListener("click", () => {
  const host = document.querySelector("#experiment")!;
  if (host.childElementCount) return;
  const liquid = document.createElement("fluid-ink") as FluidInkElement;
  liquid.setAttribute("paused", "");
  liquid.style.height = "300px";
  liquid.scene = defaultLiquidScene();
  host.append(liquid);
});
