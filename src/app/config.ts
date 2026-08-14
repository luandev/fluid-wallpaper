import { CHARCOAL, CRIMSON } from "./colors";

export type FluidConfig = {
  simResolution: number;
  dyeResolution: number;
  pressureIterations: number;
  vorticity: number;
  velocityDecay: number;
  dyeDecay: number;
  splatRadius: number;
  splatForce: number;
  dyeSplatRadius: number;
  seedVelocityScale: number;
  composerStrength: number;
  composerBroad: number;
  composerMedium: number;
  composerFine: number;
  noiseScale: number;
  noiseTime: number;
  dyeInject: number;
  warmupSteps: number;
  viewZoom: number;
  contrast: number;
  pointerEnabled: boolean;
  maxDt: number;
  crimson: string;
  charcoal: string;
  crimsonB: string;
  charcoalB: string;
  colorTweenSpeed: number;
};

export const defaultConfig: FluidConfig = {
  simResolution: 384,
  dyeResolution: 768,
  pressureIterations: 28,
  vorticity: 2.5,
  velocityDecay: 0.95,
  dyeDecay: 0.002,
  splatRadius: 0.00055,
  splatForce: 1200,
  dyeSplatRadius: 0.0009,
  seedVelocityScale: 10,
  composerStrength: 12,
  composerBroad: 1.1,
  composerMedium: 0.4,
  composerFine: 0.12,
  noiseScale: 1.05,
  noiseTime: 0.28,
  dyeInject: 0.015,
  warmupSteps: 64,
  viewZoom: 0.85,
  contrast: 0.75,
  pointerEnabled: true,
  maxDt: 1 / 30,
  crimson: CRIMSON,
  charcoal: CHARCOAL,
  crimsonB: "#8B1520",
  charcoalB: "#1A1214",
  colorTweenSpeed: 0.12,
};

export type ControlGroup = "Look" | "Flow" | "Composer" | "Quality" | "Input";

export type ControlDef = {
  key: keyof FluidConfig;
  label: string;
  group: ControlGroup;
  kind: "range" | "color" | "toggle";
  min?: number;
  max?: number;
  step?: number;
  reseed?: boolean;
};

export const controlSchema: ControlDef[] = [
  { key: "crimson", label: "Crimson", group: "Look", kind: "color" },
  { key: "charcoal", label: "Charcoal", group: "Look", kind: "color" },
  { key: "crimsonB", label: "Crimson B", group: "Look", kind: "color" },
  { key: "charcoalB", label: "Charcoal B", group: "Look", kind: "color" },
  { key: "colorTweenSpeed", label: "Tween speed", group: "Look", kind: "range", min: 0, max: 1, step: 0.01 },
  { key: "contrast", label: "Contrast", group: "Look", kind: "range", min: 0.4, max: 3, step: 0.05 },
  { key: "viewZoom", label: "View zoom", group: "Look", kind: "range", min: 0.25, max: 2.5, step: 0.01, reseed: true },
  { key: "dyeDecay", label: "Dye decay", group: "Look", kind: "range", min: 0, max: 0.05, step: 0.001 },
  { key: "vorticity", label: "Vorticity", group: "Flow", kind: "range", min: 0, max: 40, step: 0.5 },
  { key: "velocityDecay", label: "Velocity decay", group: "Flow", kind: "range", min: 0, max: 2, step: 0.01 },
  { key: "seedVelocityScale", label: "Seed velocity", group: "Flow", kind: "range", min: 0, max: 80, step: 0.5, reseed: true },
  { key: "splatForce", label: "Splat force", group: "Flow", kind: "range", min: 0, max: 8000, step: 50 },
  { key: "composerStrength", label: "Strength", group: "Composer", kind: "range", min: 0, max: 80, step: 0.5 },
  { key: "composerBroad", label: "Broad", group: "Composer", kind: "range", min: 0, max: 2, step: 0.01 },
  { key: "composerMedium", label: "Medium", group: "Composer", kind: "range", min: 0, max: 2, step: 0.01 },
  { key: "composerFine", label: "Fine", group: "Composer", kind: "range", min: 0, max: 2, step: 0.01 },
  { key: "noiseScale", label: "Noise scale", group: "Composer", kind: "range", min: 0.2, max: 8, step: 0.05 },
  { key: "noiseTime", label: "Time speed", group: "Composer", kind: "range", min: 0, max: 1.2, step: 0.01 },
  { key: "dyeInject", label: "Dye inject", group: "Composer", kind: "range", min: 0, max: 0.25, step: 0.005 },
  { key: "simResolution", label: "Sim resolution", group: "Quality", kind: "range", min: 128, max: 512, step: 32, reseed: true },
  { key: "dyeResolution", label: "Dye resolution", group: "Quality", kind: "range", min: 256, max: 1024, step: 32, reseed: true },
  { key: "pressureIterations", label: "Pressure iters", group: "Quality", kind: "range", min: 20, max: 40, step: 1, reseed: true },
  { key: "warmupSteps", label: "Warmup steps", group: "Quality", kind: "range", min: 0, max: 120, step: 1, reseed: true },
  { key: "pointerEnabled", label: "Pointer stir", group: "Input", kind: "toggle" },
];

export const RESEED_KEYS: ReadonlySet<keyof FluidConfig> = new Set(
  controlSchema.filter((control) => control.reseed).map((control) => control.key),
);

export function decayFactor(decayPerSecond: number, dt: number): number {
  return Math.exp(-Math.max(0, decayPerSecond) * Math.max(0, dt));
}

export function cloneConfig(config: FluidConfig): FluidConfig {
  return { ...config };
}

export function mergeConfig(base: FluidConfig, patch: Partial<FluidConfig>): FluidConfig {
  return { ...base, ...patch };
}

export function assertConfig(config: FluidConfig): void {
  if (config.dyeResolution < config.simResolution) {
    throw new Error("dyeResolution must be >= simResolution");
  }
  if (config.pressureIterations < 20 || config.pressureIterations > 40) {
    throw new Error("Phase 1 pressureIterations must stay in 20–40");
  }
}

export function clampConfig(config: FluidConfig): FluidConfig {
  const next = cloneConfig(config);
  for (const control of controlSchema) {
    if (control.kind !== "range" || control.min === undefined || control.max === undefined) {
      continue;
    }
    const value = next[control.key];
    if (typeof value !== "number") {
      continue;
    }
    const stepped =
      control.step && control.step >= 1
        ? Math.round(value / control.step) * control.step
        : value;
    (next[control.key] as number) = Math.min(control.max, Math.max(control.min, stepped));
  }
  if (next.dyeResolution < next.simResolution) {
    next.dyeResolution = next.simResolution;
  }
  return next;
}

export function sanitizeConfig(raw: unknown): FluidConfig {
  if (!raw || typeof raw !== "object") {
    return cloneConfig(defaultConfig);
  }
  const input = raw as Record<string, unknown>;
  const next = cloneConfig(defaultConfig);
  for (const key of Object.keys(defaultConfig) as (keyof FluidConfig)[]) {
    const value = input[key];
    if (value === undefined) {
      continue;
    }
    if (typeof defaultConfig[key] === "number" && typeof value === "number" && Number.isFinite(value)) {
      (next[key] as number) = value;
    } else if (typeof defaultConfig[key] === "boolean" && typeof value === "boolean") {
      (next[key] as boolean) = value;
    } else if (typeof defaultConfig[key] === "string" && typeof value === "string") {
      (next[key] as string) = value;
    }
  }
  return clampConfig(next);
}
