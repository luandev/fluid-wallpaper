import type { FluidConfig } from "../app/config";

export const ECO_LEVELS = [
  { scale: 1, fps: 30, speed: 1, pixels: 524288 },
  { scale: .75, fps: 30, speed: .85, pixels: 294912 },
  { scale: .5, fps: 24, speed: .65, pixels: 131072 },
  { scale: 1 / 3, fps: 20, speed: .5, pixels: 65536 },
] as const;

/** One-second windows, bounded samples and hysteresis; times are active monotonic milliseconds. */
export class EcoController {
  level = 0;
  reason = "ECO initial budget";
  private windowStart: number | null = null;
  private lastChange = -Infinity;
  private overloaded = 0;
  private comfortable = 0;
  private samples: { work: number; pacing: number }[] = [];
  get budget() { return ECO_LEVELS[this.level]; }

  suspend(): void {
    this.windowStart = null;
    this.samples = [];
    this.overloaded = this.comfortable = 0;
  }

  observe(now: number, workMs: number, presentationMs: number): boolean {
    if (![now, workMs, presentationMs].every(Number.isFinite) || workMs < 0 || presentationMs <= 0) return false;
    if (this.windowStart === null) { this.windowStart = now; return false; }
    this.samples.push({ work: workMs, pacing: presentationMs });
    if (this.samples.length > 120) this.samples.shift();
    if (now - this.windowStart < 1000) return false;
    this.windowStart = now;
    const interval = 1000 / this.budget.fps;
    const work = this.samples.map(s => s.work).sort((a, b) => a - b);
    const p90 = work[Math.floor((work.length - 1) * .9)];
    const late = this.samples.filter(s => s.pacing > interval * 1.6).length / this.samples.length > .2;
    this.samples = [];
    this.overloaded = p90 > interval * .7 || late ? this.overloaded + 1 : 0;
    this.comfortable = p90 < interval * .4 && !late ? this.comfortable + 1 : 0;
    if (now - this.lastChange < 5000) return false;
    if (this.overloaded >= 2 && this.level < ECO_LEVELS.length - 1) {
      this.level++;
      this.reason = "ECO reduced resolution and speed after sustained overload";
    } else if (this.comfortable >= 12 && this.level > 0) {
      this.level--;
      this.reason = "ECO recovered one level after sustained headroom";
    } else return false;
    this.lastChange = now;
    this.suspend();
    return true;
  }
}

/** Runtime ceilings only; authored config and persisted sliders stay unchanged. */
export function ecoGrid(config: FluidConfig, level: number) {
  const budget = ECO_LEVELS[level];
  return {
    simResolution: Math.max(64, Math.round(Math.min(config.simResolution, 192) * budget.scale)),
    dyeResolution: Math.max(128, Math.round(Math.min(config.dyeResolution, 384) * budget.scale)),
    pressureIterations: 20,
  };
}

export function ecoDisplay(width: number, height: number, pixels: number) {
  const scale = Math.min(1, Math.sqrt(pixels / Math.max(1, width * height)));
  return { pixelWidth: Math.max(1, Math.floor(width * scale)), pixelHeight: Math.max(1, Math.floor(height * scale)) };
}
