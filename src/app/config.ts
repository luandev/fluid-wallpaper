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
  keepAlive: number;
  seedVelocityScale: number;
  maxDt: number;
  crimson: string;
  charcoal: string;
};

export const defaultConfig: FluidConfig = {
  simResolution: 384,
  dyeResolution: 768,
  pressureIterations: 28,
  vorticity: 22,
  velocityDecay: 0.18,
  dyeDecay: 0.012,
  splatRadius: 0.00045,
  splatForce: 4200,
  dyeSplatRadius: 0.0007,
  keepAlive: 18,
  seedVelocityScale: 52,
  maxDt: 1 / 30,
  crimson: CRIMSON,
  charcoal: CHARCOAL,
};

export function decayFactor(decayPerSecond: number, dt: number): number {
  return Math.exp(-Math.max(0, decayPerSecond) * Math.max(0, dt));
}

export function assertConfig(config: FluidConfig): void {
  if (config.dyeResolution < config.simResolution) {
    throw new Error("dyeResolution must be >= simResolution");
  }
  if (config.pressureIterations < 20 || config.pressureIterations > 40) {
    throw new Error("Phase 1 pressureIterations must stay in 20–40");
  }
}
