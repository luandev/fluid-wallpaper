import { Engine } from "../app/engine";
import { createLandingConfig, selectLandingScene } from "../landing/scenes";

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
const sceneId = selectLandingScene(
  new URLSearchParams(location.search).get("scene"),
);

try {
  const config = {
    ...createLandingConfig(sceneId),
    backgroundMode: "solid" as const,
    videoReveal: 0,
    youtubeUrl: "",
  };
  engine = new Engine(canvas, config, { eco: true });
  engine.start();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  showFatal(
    message || "This wallpaper needs WebGL2 and floating-point render targets.",
  );
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    engine?.dispose();
    engine = null;
  });
}
