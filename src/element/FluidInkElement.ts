import { Engine, type EcoStatus } from "../app/engine";
import { cloneConfig, defaultConfig, type FluidConfig } from "../app/config";
import type { PointerSplat } from "../inputs/pointer";
import { LiquidEngine, type LiquidStatus } from "../app/liquidEngine";
import { validateLiquidScene, type LiquidScene } from "../app/liquidScene";

export type FluidInkQuality = "eco" | "balanced" | "high" | "auto";

export type FluidInkInjection = {
  position: { x: number; y: number };
  velocity?: { x: number; y: number };
  pigmentSlot?: number;
  fraction?: number;
  radius?: number;
};

const QUALITY_PATCHES: Record<Exclude<FluidInkQuality, "auto">, Partial<FluidConfig>> = {
  eco: { simResolution: 192, dyeResolution: 384, pressureIterations: 20 },
  balanced: { simResolution: 256, dyeResolution: 640, pressureIterations: 28 },
  high: { simResolution: 384, dyeResolution: 768, pressureIterations: 36 },
};

const STYLE = `
:host { display:block; position:relative; width:100%; height:100%; min-height:240px; overflow:hidden; background:#070708; }
canvas { display:block; width:100%; height:100%; touch-action:none; }
.error { position:absolute; inset:0; padding:1rem; color:#f2eaea; background:#1a1a1a; font:16px/1.5 system-ui,sans-serif; }
slot[name="fallback"] { display:none; }
:host([data-fallback="true"]) canvas { display:none; }
:host([data-fallback="true"]) slot[name="fallback"] { display:block; position:absolute; inset:0; }
`;

/** Framework-neutral host for the current Engine runtime. */
const ElementBase: typeof HTMLElement =
  typeof HTMLElement === "undefined" ? (class {} as typeof HTMLElement) : HTMLElement;

export class FluidInkElement extends ElementBase {
  static observedAttributes = ["paused", "quality", "interaction"];

  private readonly canvas: HTMLCanvasElement;
  private readonly errorNode: HTMLParagraphElement;
  private engine: Engine | null = null;
  private liquid: LiquidEngine | null = null;
  private pendingScene: LiquidScene | null = null;
  private pendingConfig: Partial<FluidConfig> = {};
  private initialized = false;

  constructor() {
    super();
    if (typeof document === "undefined" || typeof this.attachShadow !== "function") {
      throw new Error("fluid-ink requires a browser DOM to construct an element.");
    }
    const root = this.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = STYLE;
    this.canvas = document.createElement("canvas");
    this.canvas.setAttribute("aria-hidden", "true");
    this.errorNode = document.createElement("p");
    this.errorNode.className = "error";
    this.errorNode.hidden = true;
    const fallback = document.createElement("slot");
    fallback.name = "fallback";
    root.append(style, this.canvas, fallback, this.errorNode);
  }

  connectedCallback(): void {
    if (this.initialized) {
      this.engine?.resume();
      return;
    }
    this.initialized = true;
    try {
      this.dataset.fallback = "false";
      this.errorNode.hidden = true;
      if (this.pendingScene) {
        const quality = this.getAttribute("quality");
        if (quality && ["auto", "eco", "balanced", "high"].includes(quality)) this.pendingScene.quality = quality as FluidInkQuality;
        this.liquid = new LiquidEngine(this.canvas, this.pendingScene,
          status => this.dispatchEvent(new CustomEvent("qualitychange", { detail: status })),
          error => this.showError(error.message));
        if (!this.hasAttribute("paused") && !matchMedia("(prefers-reduced-motion: reduce)").matches) this.liquid.play();
        this.dispatchEvent(new CustomEvent("ready"));
        return;
      }
      const config = { ...cloneConfig(defaultConfig), ...this.pendingConfig };
      const quality = this.getAttribute("quality") ?? "auto";
      if (quality === "balanced" || quality === "high") Object.assign(config, QUALITY_PATCHES[quality]);
      this.engine = new Engine(this.canvas, config, {
        eco: quality === "eco",
        onEcoChange: status => this.dispatchEvent(new CustomEvent("qualitychange", { detail: status ?? { quality: this.getAttribute("quality") ?? "auto" } })),
      });
      this.dispatchEvent(new CustomEvent("qualitychange", { detail: this.engine.getEcoStatus() ?? { quality } }));
      if (this.hasAttribute("paused")) {
        this.engine.pause();
      } else {
        this.engine.start();
      }
      this.dispatchEvent(new CustomEvent("ready", { bubbles: false, composed: false }));
    } catch (error) {
      this.engine?.dispose(); this.engine = null;
      this.liquid?.dispose(); this.liquid = null;
      this.initialized = false;
      this.showError(error instanceof Error ? error.message : String(error));
    }
  }

  disconnectedCallback(): void {
    this.liquid?.dispose(); this.liquid = null;
    this.engine?.dispose();
    this.engine = null;
    this.initialized = false;
  }

  attributeChangedCallback(name: string): void {
    if (this.liquid) {
      if (name === "paused") {
        if (this.hasAttribute("paused")) this.liquid.pause(); else this.liquid.play();
      }
      if (name === "quality") {
        const next = this.liquid.getScene();
        const quality = this.getAttribute("quality") ?? "auto";
        if (["auto", "eco", "balanced", "high"].includes(quality)) {
          next.quality = quality as FluidInkQuality; this.updateScene(next);
        }
      }
      return;
    }
    if (!this.engine) {
      return;
    }
    if (name === "paused") {
      if (this.hasAttribute("paused")) this.engine.pause();
      else this.engine.resume();
    }
    if (name === "quality") {
      this.applyQuality();
    }
  }

  get config(): FluidConfig {
    return this.engine?.getConfig() ?? { ...cloneConfig(defaultConfig), ...this.pendingConfig };
  }

  set config(next: Partial<FluidConfig>) {
    if (this.pendingScene) throw new Error("Use updateScene for the two-liquid model");
    this.pendingConfig = { ...this.pendingConfig, ...next };
    if (this.engine) this.setConfig(next);
  }

  play(): void {
    this.removeAttribute("paused");
    this.liquid?.play();
  }

  pause(): void {
    this.setAttribute("paused", "");
  }

  reset(): void {
    this.liquid?.reset();
    this.engine?.reseed();
  }

  inject(command: FluidInkInjection): void {
    const velocity = command.velocity ?? { x: 0, y: 0 };
    if (this.liquid) {
      this.liquid.inject(clamp01(command.position.x), clamp01(command.position.y), command.pigmentSlot ?? 0, command.fraction ?? .1, command.radius ?? .04, velocity.x, velocity.y);
      return;
    }
    const splat: PointerSplat = {
      uv: [clamp01(command.position.x), clamp01(command.position.y)],
      delta: [velocity.x, velocity.y],
    };
    this.engine?.inject(splat);
  }

  setConfig(patch: Partial<FluidConfig>): void {
    if (this.pendingScene) throw new Error("Use updateScene for the two-liquid model; legacy sliders have no physical migration");
    this.pendingConfig = { ...this.pendingConfig, ...patch };
    if (!this.engine) return;
    const next = this.engine.applyConfig(patch);
    if (needsRebuild(patch)) this.engine.reseed();
    this.dispatchEvent(new CustomEvent("configchange", { detail: next }));
  }

  getConfig(): FluidConfig {
    return this.config;
  }

  get scene(): LiquidScene | null { return this.liquid?.getScene() ?? (this.pendingScene ? structuredClone(this.pendingScene) : null); }
  /** Assigning a model creates a fresh composition; null selects the legacy configuration. */
  set scene(value: LiquidScene | null) {
    const next = value === null ? null : validateLiquidScene(value);
    this.disconnectedCallback(); this.pendingScene = next;
    if (this.isConnected) this.connectedCallback();
  }
  updateScene(value: LiquidScene): void {
    if (!this.liquid) throw new Error("Assign a scene on a connected element first");
    this.liquid.updateScene(value); this.pendingScene = this.liquid.getScene();
    this.dispatchEvent(new CustomEvent("scenechange", { detail: this.scene }));
  }
  get qualityStatus(): LiquidStatus | EcoStatus | null { return this.liquid?.status ?? this.engine?.getEcoStatus() ?? null; }

  private applyQuality(): void {
    const quality = (this.getAttribute("quality") ?? "auto") as FluidInkQuality;
    if (!this.engine) return;
    if (quality === "eco") { this.engine.setEcoMode(true); return; }
    const wasEco = this.engine.getEcoStatus() !== null;
    if (quality !== "auto") {
      const next = this.engine.applyConfig(QUALITY_PATCHES[quality] ?? QUALITY_PATCHES.balanced);
      this.dispatchEvent(new CustomEvent("configchange", { detail: next }));
    }
    this.engine.setEcoMode(false);
    if (!wasEco && quality !== "auto") this.engine.reseed();
    if (!wasEco) this.dispatchEvent(new CustomEvent("qualitychange", { detail: { quality } }));
  }

  private showError(message: string): void {
    this.dataset.fallback = "true";
    this.errorNode.hidden = false;
    this.errorNode.textContent = message;
    this.dispatchEvent(new CustomEvent("error", { detail: { code: "ENGINE_INIT_FAILED", message } }));
  }
}

function clamp01(value: number): number {
  return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;
}

function needsRebuild(patch: Partial<FluidConfig>): boolean {
  return ["simResolution", "dyeResolution", "pressureIterations", "warmupSteps", "viewZoom"].some(
    (key) => key in patch,
  );
}
