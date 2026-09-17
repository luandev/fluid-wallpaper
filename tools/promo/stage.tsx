// Capture-only host. Imports the real Engine, React dashboard and native heroes.
import React from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { Engine } from "../../src/app/engine";
import { Dashboard } from "../../src/ui/Dashboard";
import { FluidHero } from "../../src/react/FluidHero";
import { defineFluidHero } from "../../src/hero";
import { AudioAnalyser } from "../../src/inputs/audioAnalyser";
import "./style.css";

const w = window as any;
let now = 1000,
  serial = 0;
const callbacks = new Map<number, FrameRequestCallback>();
window.requestAnimationFrame = (fn) => {
  callbacks.set(++serial, fn);
  return serial;
};
window.cancelAnimationFrame = (id) => {
  callbacks.delete(id);
};
const root = createRoot(document.getElementById("root")!);
let engine: Engine | null = null,
  shot: any,
  frame = 0,
  recorded: any[] = [],
  liquid: any;
let initial: any;
let actions: any[] = [];
let panelRoot: ReturnType<typeof createRoot> | null = null;
const settle = () => new Promise((r) => setTimeout(r, 0));
function runFrame() {
  now += 1000 / 30;
  const pending = [...callbacks.values()];
  callbacks.clear();
  flushSync(() => pending.forEach((fn) => fn(now)));
}
function button(text: string) {
  const b = [...document.querySelectorAll("button")].find(
    (b) => b.textContent?.trim() === text,
  );
  if (!b) throw Error(`Button missing: ${text}`);
  flushSync(() => b.click());
}
function input(selector: string, value: string | number) {
  const e = document.querySelector(selector) as HTMLInputElement;
  if (!e) throw Error(`Input missing: ${selector}`);
  const proto =
    e instanceof HTMLSelectElement
      ? HTMLSelectElement.prototype
      : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, "value")!.set!.call(e, String(value));
  flushSync(() => {
    e.dispatchEvent(new Event("input", { bubbles: true }));
    e.dispatchEvent(new Event("change", { bubbles: true }));
  });
  actions.push({ frame, selector, value });
}
function range(name: string, v: number) {
  input(`input[type=range][aria-label="${name}"]`, v);
}
const heading = (title: string, kicker: string) => {
  document.getElementById("title")!.textContent = title;
  document.getElementById("kicker")!.textContent = kicker;
};
w.prepare = async (s: any, portrait: boolean, audio: any[] = []) => {
  panelRoot?.unmount();
  panelRoot = null;
  engine?.dispose();
  engine = null;
  flushSync(() => root.render(null));
  callbacks.clear();
  frame = 0;
  now = 1000;
  shot = s;
  recorded = audio;
  actions = [];
  document.body.className = [portrait ? "portrait" : "landscape", s.mode].join(
    " ",
  );
  heading(s.title, s.kicker);
  document.getElementById("url")!.textContent =
    s.mode === "close" ? "luandev.github.io/fluid-wallpaper" : "";
  const doc = await (await fetch(`/presets/${s.preset}/preset.json`)).json();
  initial = structuredClone(doc.presets[0].config);
  initial.youtubeUrl = "";
  initial.warmupSteps = 120;
  initial.simResolution = 320;
  initial.dyeResolution = 768;
  initial.viewZoom = portrait ? 1.15 : 1.5;
  if (s.mode === "emitters") initial.emitters = initial.emitters.slice(0, 1);
  if (s.mode === "wind") initial.windStations = [];
  if (s.mode === "drivers") {
    initial.valueEmitters = [
      {
        id: "current",
        name: "Material tide",
        enabled: true,
        kind: "sine",
        rate: 4,
        phase: 0,
        from: 0.1,
        to: 0.95,
        scale: 1,
        band: 0,
      },
    ];
    initial.valueBindings = [
      {
        id: "tide",
        emitterId: "current",
        path: `materials.${initial.materials[0].id}.glow`,
        amount: 1,
      },
    ];
  }
  if (s.mode === "music") {
    initial.youtubeUrl = "00000000000";
    initial.backgroundMode = "video";
    initial.videoReveal = 0;
  }
  if (s.mode === "audio") {
    initial.valueEmitters = [
      {
        id: "sound",
        name: "Soundtrack spectrum",
        enabled: true,
        kind: "audioSpectrum",
        rate: 1,
        phase: 0,
        from: 0,
        to: 1,
        scale: 1,
        band: 0.12,
      },
    ];
    initial.valueBindings = [
      {
        id: "sound-glow",
        emitterId: "sound",
        path: `materials.${initial.materials[0].id}.glow`,
        amount: 1,
      },
    ];
  }
  if (s.mode === "heroes") {
    defineFluidHero();
    flushSync(() =>
      root.render(
        <div className="heroes">
          <section>
            <small>NATIVE WEB COMPONENT</small>
            {React.createElement(
              "fluid-hero",
              { preset: "aurora", quality: "high", style: { height: "620px" } },
              <h2>Art, in every pixel.</h2>,
            )}
          </section>
          <section>
            <small>REACT</small>
            <FluidHero preset="ember" quality="high" style={{ height: 620 }}>
              <h2>A living first impression.</h2>
            </FluidHero>
          </section>
        </div>,
      ),
    );
  } else if (s.mode === "liquid") {
    const host = document.createElement("div");
    host.id = "liquid-studio";
    document.getElementById("root")!.append(host);
    await import("../../src/ui/LiquidTuner");
    await settle();
    liquid = document.querySelector("fluid-ink");
  } else {
    flushSync(() => root.render(<canvas id="field" />));
    const canvas = document.getElementById("field") as HTMLCanvasElement;
    engine = new Engine(canvas, initial);
    w.engine = engine;
    engine.start();
    if (
      [
        "materials",
        "lighting",
        "emitters",
        "wind",
        "drivers",
        "presets",
        "music",
        "distribution",
      ].includes(s.mode)
    ) {
      const panel = document.createElement("div");
      panel.id = "panel";
      document.getElementById("root")!.append(panel);
      panelRoot = createRoot(panel);
      flushSync(() =>
        panelRoot!.render(
          <Dashboard engine={engine!} canvas={canvas} persist={false} />,
        ),
      );
      button(
        (
          {
            materials: "Materials",
            lighting: "Materials",
            emitters: "Emitters",
            wind: "Wind",
            drivers: "Drivers",
            presets: "Presets",
            music: "Scene",
            distribution: "Scene",
          } as any
        )[s.mode],
      );
    }
  }
  await settle();
  for (let i = 0; i < 30; i++) runFrame();
  await settle();
  if (s.mode === "audio") {
    if (!recorded.length) throw Error("Actual analyser recording required");
    // Replay measured analyser output at the render timeline, not fabricated beats.
    // This isolates slow screenshot encoding from the real-time microphone clock.
    const a = (engine as any).audio;
    a.sample = () => {
      a.frame = recorded[Math.min(frame, recorded.length - 1)].audio;
      return a.frame;
    };
  }
  return {
    config: engine?.getConfig(),
    canvas: document.querySelector("canvas")?.getBoundingClientRect().toJSON(),
  };
};
w.step = async (n: number) => {
  frame = n;
  const t = n / 30;
  if (shot.mode === "pointer") {
    const x = 0.52 + 0.24 * Math.sin(t * 1.6),
      y = 0.5 + 0.2 * Math.sin(t * 2.1);
    const oldx = 0.52 + 0.24 * Math.sin((t - 1 / 30) * 1.6),
      oldy = 0.5 + 0.2 * Math.sin((t - 1 / 30) * 2.1);
    engine!.inject({ uv: [x, 1 - y], delta: [x - oldx, oldy - y] });
    const c = document.getElementById("cursor")!;
    c.style.left = `${x * 100}%`;
    c.style.top = `${y * 100}%`;
  }
  if (shot.mode === "materials") {
    if (n === 30) input("input[type=color]", "#ff9b35");
    if (n >= 45 && n <= 90) range("Glow", (n - 45) / 45);
    if (n >= 100 && n <= 140) range("Sheen", (n - 100) / 40);
  }
  if (shot.mode === "lighting") {
    if (n >= 10 && n <= 65) {
      range("Roughness", 1 - (n - 10) / 55);
      range("Metallic", (n - 10) / 55);
      range("Sheen", (n - 10) / 55);
    }
  }
  if (shot.mode === "emitters") {
    if (n === 15) button("Add");
    if (n === 25) input(".dash select", "point");
    if (n >= 30 && n <= 75) {
      range("U", 0.15 + (n - 30) / 130);
      range("V", 0.52);
    }
  }
  if (shot.mode === "wind") {
    if (n === 15) button("Add");
    if (n >= 30 && n <= 75) {
      range("Heading", 0.1 + (n - 30) / 60);
      range("U", 0.18 + (n - 30) / 150);
      range("V", 0.6);
      range("Speed", 0.6);
    }
  }
  if (shot.mode === "backgrounds") {
    const modes = ["solid", "gradient", "transparent"] as const;
    engine!.applyConfig({
      backgroundMode: modes[Math.min(2, Math.floor(t))],
      backgroundColor: "#101c30",
      backgroundColorB: "#60344c",
    });
    heading(
      shot.title,
      modes[Math.min(2, Math.floor(t))].toUpperCase() + " BACKGROUND",
    );
  }
  if (shot.mode === "presets") {
    if (n === 5)
      input('input[placeholder="Preset name"]', "Chromatic currents");
    if (n === 15) button("Save");
    if (n === 35) button("Load");
  }
  if (shot.mode === "distribution") {
    if (n === 60) {
      engine!.setEcoMode(true);
      heading("Choose your balance.", "ECO · ADAPTIVE QUALITY");
      const body = document.querySelector(".dash__body");
      const group = [...document.querySelectorAll(".dash__group")].find(
        (e) => e.querySelector("h3")?.textContent === "Quality",
      );
      if (body && group)
        body.scrollTop = (group as HTMLElement).offsetTop - 130;
    }
  }
  if (shot.mode === "liquid") {
    if (n === 25) button("Add crimson");
    if (n === 50) button("Add blue");
    if (n === 75) button("Add gold");
    if (n === 165) input("#liquid-studio select", "eco");
  }
  if (shot.mode === "liquid") {
    const ranges = [
      ...document.querySelectorAll("input[type=range]"),
    ] as HTMLInputElement[];
    const index = ranges.findIndex((e) =>
      e.parentElement?.textContent?.toLowerCase().includes("absorption"),
    );
    if (index < 0) throw Error("Studio absorption control missing");
    const target = ranges[index];
    Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )!.set!.call(target, String(0.2 + 1.8 * (0.5 - 0.5 * Math.cos(t * 0.9))));
    flushSync(() =>
      target.dispatchEvent(new Event("input", { bubbles: true })),
    );
  }
  runFrame();
  await settle();
  const gl = (engine as any)?.gl;
  gl?.finish();
  const error = gl?.getError() ?? 0;
  if (error) throw Error(`WebGL error ${error}`);
  return {
    audio: shot.mode === "audio" ? engine!.getAudioFrame() : undefined,
    glow:
      shot.mode === "audio"
        ? engine!.getLiveConfig().materials[0].glow
        : undefined,
  };
};
w.measureAudio = async () => {
  const analyser = new AudioAnalyser();
  const status = await analyser.setSource("microphone");
  if (status !== "live") throw Error(`Microphone status ${status}`);
  const start = performance.now(),
    samples = [];
  for (let i = 0; i < 360; i++) {
    await new Promise((r) =>
      setTimeout(r, Math.max(0, start + (i * 1000) / 30 - performance.now())),
    );
    samples.push({
      time: (performance.now() - start) / 1000,
      audio: structuredClone(analyser.sample(1 / 30)),
    });
  }
  analyser.dispose();
  return samples;
};
w.environment = () => {
  const c =
    document.querySelector("canvas") ?? document.createElement("canvas");
  const gl = c.getContext("webgl2")!;
  const ext = gl.getExtension("WEBGL_debug_renderer_info");
  return {
    userAgent: navigator.userAgent,
    renderer: ext
      ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)
      : gl.getParameter(gl.RENDERER),
    vendor: ext
      ? gl.getParameter(ext.UNMASKED_VENDOR_WEBGL)
      : gl.getParameter(gl.VENDOR),
    glVersion: gl.getParameter(gl.VERSION),
    viewport: [innerWidth, innerHeight],
    devicePixelRatio,
  };
};
w.evidence = () => ({
  actions,
  finalConfig: engine?.getConfig(),
  liveConfig: engine?.getLiveConfig(),
  eco: engine?.getEcoStatus(),
  liquidScene: (document.querySelector("#liquid-studio fluid-ink") as any)
    ?.scene,
});
w.ready = true;
