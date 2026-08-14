import { Engine } from "./app/engine";

const canvas = document.querySelector("#view");
const fatal = document.querySelector("#fatal");

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

try {
  engine = new Engine(canvas);
  engine.start();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  showFatal(message);
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    engine?.dispose();
    engine = null;
  });
}
