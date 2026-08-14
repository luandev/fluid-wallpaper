import { Engine } from "./app/engine";
import { loadStoredConfig, mountDashboard } from "./app/dashboard";

const canvas = document.querySelector("#view");
const fatal = document.querySelector("#fatal");
const dashRoot = document.querySelector("#dash");

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

try {
  engine = new Engine(canvas, loadStoredConfig());
  engine.start();
  if (dashRoot instanceof HTMLElement) {
    dashRoot.hidden = false;
    unmountDash = mountDashboard(engine, dashRoot);
  }
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  showFatal(message);
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    unmountDash?.();
    unmountDash = null;
    engine?.dispose();
    engine = null;
  });
}
