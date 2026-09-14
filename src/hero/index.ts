import {
  defineFluidInk,
  FluidInkElement,
  type FluidInkQuality,
} from "../element";
import { sanitizeConfig, type FluidConfig } from "../app/config";
import { getFluidPreset } from "../presets";
const Base: typeof HTMLElement =
  typeof HTMLElement === "undefined"
    ? (class {} as typeof HTMLElement)
    : HTMLElement;
/** A decorative, lifecycle-aware hero. Content belongs to the caller's light DOM. */
export class FluidHeroElement extends Base {
  static observedAttributes = ["preset", "quality", "paused", "interactive"];
  private field: FluidInkElement | null = null;
  private observer: IntersectionObserver | null = null;
  private reduced: MediaQueryList | null = null;
  private visible = false;
  private explicitlyPlaying = false;
  private overrides: Partial<FluidConfig> = {};
  private surface: HTMLDivElement;
  private playButton: HTMLButtonElement;
  constructor() {
    super();
    const root = this.attachShadow({ mode: "open" });
    root.innerHTML = `<style>
      :host{display:block;position:relative;isolation:isolate;overflow:hidden;min-height:var(--fluid-hero-height,440px);border-radius:var(--fluid-hero-radius,24px)}
      .surface,.scrim{position:absolute;inset:0;z-index:-2;pointer-events:none}
      fluid-ink{height:100%;min-height:0}.scrim{z-index:-1;background:var(--fluid-hero-overlay,linear-gradient(90deg,#081019c9,#08101925))}
      :host([data-transparent]) .scrim{background:transparent}
      .content{box-sizing:border-box;max-width:var(--fluid-hero-content-width,1200px);margin:auto;padding:clamp(28px,6vw,80px);pointer-events:none}.content ::slotted(*){pointer-events:auto}
      button{position:absolute;right:18px;bottom:18px;border:1px solid #ffffff60;border-radius:999px;background:#101820;color:white;padding:10px 16px;cursor:pointer}
      [hidden]{display:none!important}
    </style><div class="surface" aria-hidden="true"></div><div class="scrim"></div><div class="content"><slot></slot></div><button type="button" hidden>Play animation</button>`;
    this.surface = root.querySelector(".surface")!;
    this.playButton = root.querySelector("button")!;
    this.playButton.onclick = () => this.play();
  }
  get config(): FluidConfig {
    return sanitizeConfig({
      ...getFluidPreset(this.getAttribute("preset") || "aurora"),
      ...this.overrides,
    });
  }
  set config(value: Partial<FluidConfig>) {
    this.overrides = structuredClone(value);
    this.updateConfig();
  }
  get qualityStatus() {
    return this.field?.qualityStatus ?? null;
  }
  connectedCallback() {
    this.reduced = matchMedia("(prefers-reduced-motion: reduce)");
    this.reduced.addEventListener("change", this.sync);
    document.addEventListener("visibilitychange", this.sync);
    this.observer = new IntersectionObserver((entries) => {
      this.visible = entries[0]?.isIntersecting ?? false;
      this.sync();
    });
    this.observer.observe(this);
    this.updateConfig();
  }
  disconnectedCallback() {
    this.observer?.disconnect();
    this.observer = null;
    this.reduced?.removeEventListener("change", this.sync);
    document.removeEventListener("visibilitychange", this.sync);
    this.field?.remove();
    this.field = null;
    this.visible = false;
  }
  attributeChangedCallback(
    name: string,
    previous: string | null,
    next: string | null,
  ) {
    if (previous === next) return;
    if (name === "preset") {
      this.field?.remove();
      this.field = null;
      this.updateConfig();
    } else if (name === "interactive") this.updateConfig();
    else {
      if (name === "quality")
        this.field?.setAttribute(
          "quality",
          this.getAttribute("quality") || "eco",
        );
      this.sync();
    }
  }
  play() {
    this.explicitlyPlaying = true;
    this.removeAttribute("paused");
    this.sync();
  }
  pause() {
    this.setAttribute("paused", "");
  }
  reset() {
    this.field?.reset();
  }
  private updateConfig() {
    try {
      const config = this.config;
      this.toggleAttribute(
        "data-transparent",
        config.backgroundMode === "transparent",
      );
      this.surface.style.background =
        config.backgroundMode === "transparent"
          ? "transparent"
          : `linear-gradient(135deg,${config.backgroundColor},${config.backgroundColorB})`;
      this.surface.style.pointerEvents = this.hasAttribute("interactive")
        ? "auto"
        : "none";
      if (this.field) {
        const next = {
            ...config,
            pointerEnabled: this.hasAttribute("interactive"),
          },
          before = this.field.getConfig();
        const patch = Object.fromEntries(
          Object.entries(next).filter(
            ([key, value]) =>
              JSON.stringify(value) !==
              JSON.stringify(before[key as keyof FluidConfig]),
          ),
        ) as Partial<FluidConfig>;
        if (Object.keys(patch).length) this.field.setConfig(patch);
      }
      this.sync();
    } catch (error) {
      this.dispatchEvent(
        new CustomEvent("error", { detail: { message: String(error) } }),
      );
    }
  }
  private sync = () => {
    if (!this.isConnected) return;
    const motionAllowed = !this.reduced?.matches || this.explicitlyPlaying;
    this.playButton.hidden = motionAllowed;
    const running =
      this.visible &&
      !document.hidden &&
      !this.hasAttribute("paused") &&
      motionAllowed;
    if (running && !this.field) {
      try {
        defineFluidInk();
        const field = document.createElement("fluid-ink") as FluidInkElement;
        field.setAttribute("paused", "");
        field.setAttribute("quality", this.getAttribute("quality") || "eco");
        field.config = {
          ...this.config,
          pointerEnabled: this.hasAttribute("interactive"),
        };
        for (const event of ["ready", "error", "configchange", "qualitychange"])
          field.addEventListener(event, (e) => {
            if (event === "error") field.hidden = true;
            this.dispatchEvent(
              new CustomEvent(event, { detail: (e as CustomEvent).detail }),
            );
          });
        this.field = field;
        this.surface.append(field);
      } catch (error) {
        this.dispatchEvent(
          new CustomEvent("error", { detail: { message: String(error) } }),
        );
        return;
      }
    }
    if (running) this.field?.play();
    else this.field?.pause();
  };
}
export function defineFluidHero(): void {
  if (
    typeof customElements !== "undefined" &&
    !customElements.get("fluid-hero")
  )
    customElements.define("fluid-hero", FluidHeroElement);
}
export type { FluidInkQuality };
