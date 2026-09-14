import type { LiquidQuality } from "../app/liquidScene";

export const LIQUID_MEMORY_CAP = 32 * 1024 * 1024;
// Prototype keeps pigments collocated for identical carrier transfer rates.
export const LIQUID_TIERS = [
  { cells: 4096, pixels: 131072, detail: false },
  { cells: 16384, pixels: 262144, detail: false },
  { cells: 65536, pixels: 262144, detail: false },
  { cells: 65536, pixels: 524288, detail: false },
  { cells: 65536, pixels: 524288, detail: true },
] as const;

export class LiquidQualityController {
  tier = 4;
  fps = 30;
  reason = "initial budget";
  private overloaded = 0;
  private comfortable = 0;
  private lastChange = -Infinity;
  private lastWindow = -Infinity;
  private samples: { workMs: number; pacingOverload: boolean }[] = [];
  policy: LiquidQuality = "auto";

  setPolicy(policy: LiquidQuality): void {
    this.policy = policy;
    this.tier = policy === "eco" ? 1 : policy === "balanced" ? 3 : 4;
    this.fps = 30;
    this.overloaded = this.comfortable = 0;
    this.samples = [];
    this.reason = `requested ${policy}`;
  }

  sample(workMs: number, pacingOverload: boolean): void {
    if (Number.isFinite(workMs) && workMs >= 0) this.samples.push({ workMs, pacingOverload });
    // Guard calls outside the runtime's once-per-second evaluation contract.
    if (this.samples.length > 240) this.samples.shift();
  }

  observe(now: number, workMs: number, pacingOverload: boolean, presentationFps: number): boolean {
    if (this.policy !== "auto" || now - this.lastWindow < 1000) return false;
    this.lastWindow = now;
    if (this.samples.length) {
      const sorted = this.samples.map(s => s.workMs).sort((a, b) => a - b);
      workMs = sorted[Math.floor((sorted.length - 1) * .9)];
      pacingOverload = this.samples.filter(s => s.pacingOverload).length / this.samples.length > .2;
      this.samples = [];
    }
    const budget = 500 / presentationFps;
    this.overloaded = workMs > budget || pacingOverload ? this.overloaded + 1 : 0;
    this.comfortable = workMs < budget * 0.6 && !pacingOverload ? this.comfortable + 1 : 0;
    if (now - this.lastChange < 5000) return false;
    if (this.overloaded >= 2 && (this.tier > 0 || this.fps > 24)) {
      if (this.tier > 0) this.tier--; else this.fps = 24;
      this.reason = "two overloaded windows";
    } else if (this.comfortable >= 10 && (this.tier < 4 || this.fps < 30)) {
      if (this.fps < 30) this.fps = 30; else this.tier++;
      this.reason = "ten comfortable windows";
    } else return false;
    this.lastChange = now;
    this.overloaded = this.comfortable = 0;
    return true;
  }
}

/** Deterministic fixed-time accounting, independent of presentation refresh. */
export class LiquidClock {
  pending = 0;
  simulated = 0;
  dropped = 0;
  add(seconds: number): void {
    this.pending += Math.max(0, seconds);
    if (this.pending > 4 / 30) { this.dropped += this.pending - 4 / 30; this.pending = 4 / 30; }
  }
  advance(limit: number | (() => number), step: (dt: number) => void): number {
    let steps = 0;
    while (this.pending >= 1 / 30 - 1e-9 && steps < 4) {
      const dt = Math.min(1 / 30, typeof limit === "function" ? limit() : limit);
      if (!(dt > 0) || !Number.isFinite(dt)) break;
      step(dt); this.pending -= dt; this.simulated += dt; steps++;
    }
    return steps;
  }
  suspend(): void { this.pending = 0; }
}
