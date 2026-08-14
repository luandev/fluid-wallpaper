import { hexToRgb, rgbToHex } from "./colors";
import type { FluidConfig } from "./config";
import { mixRgb, type Rgb } from "./palette";

export type LivePrimaries = {
  crimson: Rgb;
  charcoal: Rgb;
  crimsonHex: string;
  charcoalHex: string;
  t: number;
};

/** Ping-pong triangle in [0,1]. Period 2: 0→1→0. */
export function triangleWave(phase: number): number {
  if (!Number.isFinite(phase)) {
    return 0;
  }
  const period = ((phase % 2) + 2) % 2;
  return period <= 1 ? period : 2 - period;
}

export function tweenAmount(elapsed: number, speed: number): number {
  if (speed <= 0) {
    return 0;
  }
  return triangleWave(elapsed * speed);
}

export function tweenPrimaries(config: FluidConfig, elapsed: number): LivePrimaries {
  const t = tweenAmount(elapsed, config.colorTweenSpeed);
  const crimsonA = hexToRgb(config.crimson);
  const charcoalA = hexToRgb(config.charcoal);
  const crimsonB = hexToRgb(config.crimsonB);
  const charcoalB = hexToRgb(config.charcoalB);
  const crimson = mixRgb(crimsonA, crimsonB, t);
  const charcoal = mixRgb(charcoalA, charcoalB, t);
  return {
    crimson,
    charcoal,
    crimsonHex: rgbToHex(crimson),
    charcoalHex: rgbToHex(charcoal),
    t,
  };
}
