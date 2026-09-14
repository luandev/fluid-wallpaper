import { getFluidPreset, fluidPresets } from "./presets";
import type { FluidConfig } from "./app/config";
import { Engine } from "./app/engine";
import { loadStoredConfig } from "./app/storage";
import { mountDashboard } from "./ui/Dashboard";
import { mountPerfHud } from "./app/perfHud";

const canvas = document.querySelector("#view");
const fatal = document.querySelector("#fatal");
const dashRoot = document.querySelector("#dash");
const perfRoot = document.querySelector("#perf");

if (!(canvas instanceof HTMLCanvasElement)) {
  throw new Error("Missing #view canvas");
}

function showFatal(message: string): void {
  if (fatal instanceof HTMLElement) {
    fatal.dataset.show = "true";
    fatal.textContent = message;
  } else {
    console.error(message);
  }
}

let engine: Engine | null = null;
let unmountDash: (() => void) | null = null;
let unmountPerf: (() => void) | null = null;

try {
  const query = new URLSearchParams(location.search),
    id = query.get("preset");
  const fromGallery = !!id && fluidPresets.some((p) => p.id === id);
  const initial = fromGallery ? getFluidPreset(id!) : loadStoredConfig();
  const background = query.get("background");
  if (
    fromGallery &&
    ["solid", "gradient", "transparent"].includes(background ?? "")
  )
    initial.backgroundMode = background as FluidConfig["backgroundMode"];
  engine = new Engine(canvas, initial, { eco: fromGallery });
  engine.start();
  if (dashRoot instanceof HTMLElement) {
    dashRoot.hidden = false;
    unmountDash = mountDashboard(engine, dashRoot, { canvas });
  }
  if (perfRoot instanceof HTMLElement) {
    unmountPerf = mountPerfHud(engine, perfRoot);
  }
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  showFatal(message);
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    unmountDash?.();
    unmountDash = null;
    unmountPerf?.();
    unmountPerf = null;
    engine?.dispose();
    engine = null;
  });
}
