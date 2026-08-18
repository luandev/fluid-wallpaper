import { attachDraggablePanel, restorePanelPosition } from "./dragPanel";
import { shortcutFromKey } from "../ui/shortcuts";

export type PerfSample = {
  fps: number;
  frameMs: number;
  simWidth: number;
  simHeight: number;
  dyeWidth: number;
  dyeHeight: number;
};

const STORAGE_KEY = "fluid-wallpaper.perfHud.v1";

export type PerfProvider = {
  getPerfSample: () => PerfSample;
};

export function mountPerfHud(engine: PerfProvider, root: HTMLElement): () => void {
  root.replaceChildren();
  root.classList.add("perf");
  root.hidden = false;
  root.dataset.open = loadOpen() ? "true" : "false";

  const title = el("div", "perf__title", "Perf");
  title.title = "Drag to move";
  const fpsLine = el("div", "perf__line");
  const frameLine = el("div", "perf__line");
  const simLine = el("div", "perf__line");
  const dyeLine = el("div", "perf__line");
  root.append(title, fpsLine, frameLine, simLine, dyeLine);
  const detachPerfDrag = attachDraggablePanel({ element: root, handle: title, id: "perf" });

  const setOpen = (open: boolean): void => {
    root.dataset.open = open ? "true" : "false";
    saveOpen(open);
    if (open) {
      restorePanelPosition(root, "perf");
    }
  };

  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "perf__fab";
  toggle.textContent = "Perf";
  toggle.title = "Click to toggle, drag to move";
  toggle.setAttribute("aria-label", "Toggle performance HUD");
  toggle.addEventListener("click", () => setOpen(root.dataset.open !== "true"));

  const host = root.parentElement ?? document.body;
  host.append(toggle);
  const detachFabDrag = attachDraggablePanel({ element: toggle, handle: toggle, id: "perfFab" });

  const onKey = (event: KeyboardEvent): void => {
    if (shortcutFromKey(event, event.target) !== "togglePerf") {
      return;
    }
    setOpen(root.dataset.open !== "true");
  };
  window.addEventListener("keydown", onKey);

  let raf = 0;
  const paint = (): void => {
    raf = requestAnimationFrame(paint);
    if (root.dataset.open !== "true") {
      return;
    }
    const sample = engine.getPerfSample();
    fpsLine.textContent = `FPS  ${sample.fps.toFixed(1)}`;
    frameLine.textContent = `Frame  ${sample.frameMs.toFixed(2)} ms`;
    simLine.textContent = `Sim  ${sample.simWidth}×${sample.simHeight}`;
    dyeLine.textContent = `Dye  ${sample.dyeWidth}×${sample.dyeHeight}`;
  };
  raf = requestAnimationFrame(paint);

  return () => {
    window.removeEventListener("keydown", onKey);
    cancelAnimationFrame(raf);
    detachPerfDrag();
    detachFabDrag();
    toggle.remove();
    root.replaceChildren();
    root.hidden = true;
  };
}

function loadOpen(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function saveOpen(open: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, open ? "1" : "0");
  } catch {
    // ignore quota / private mode
  }
}

function el(tag: string, className: string, text?: string): HTMLElement {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) {
    node.textContent = text;
  }
  return node;
}
