import { Engine } from "../app/engine";
import {
  createLandingConfig,
  LANDING_SCENES,
  selectLandingScene,
} from "./scenes";
import "./landing.css";

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
const scene = LANDING_SCENES.find((item) => item.id === sceneId)!;
document.documentElement.style.setProperty("--crimson", scene.accent);
document.body.dataset.scene = sceneId;
document.querySelector("#scene-name")!.textContent = scene.name;
document.querySelector("#scene-description")!.textContent = scene.description;
document.querySelector("#scene-character")!.textContent = scene.character;
for (const link of document.querySelectorAll<HTMLAnchorElement>(
  "[data-scene-link]",
)) {
  if (link.dataset.sceneLink === sceneId)
    link.setAttribute("aria-current", "true");
}

try {
  engine = new Engine(canvas, createLandingConfig(sceneId));
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
