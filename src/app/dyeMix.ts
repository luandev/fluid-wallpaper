export function dyeMixT(n: number): number {
  const edge0 = -0.55;
  const edge1 = 0.55;
  const x = Math.min(1, Math.max(0, (n - edge0) / (edge1 - edge0)));
  return x * x * (3 - 2 * x);
}

export function dyeMix(
  n: number,
  charcoal: readonly [number, number, number],
  crimson: readonly [number, number, number],
): [number, number, number] {
  const t = dyeMixT(n);
  return [
    charcoal[0] + (crimson[0] - charcoal[0]) * t,
    charcoal[1] + (crimson[1] - charcoal[1]) * t,
    charcoal[2] + (crimson[2] - charcoal[2]) * t,
  ];
}

export type DyeStats = {
  meanRed: number;
  crimsonFrac: number;
  charcoalFrac: number;
};

export function dyeStatsFromRgba8(pixels: Uint8Array): DyeStats {
  const count = Math.floor(pixels.length / 4);
  if (count === 0) {
    return { meanRed: 0, crimsonFrac: 0, charcoalFrac: 1 };
  }
  let redSum = 0;
  let crimson = 0;
  let charcoal = 0;
  for (let i = 0; i < count; i += 1) {
    const r = pixels[i * 4] / 255;
    redSum += r;
    if (r > 0.35) {
      crimson += 1;
    } else if (r < 0.12) {
      charcoal += 1;
    }
  }
  return {
    meanRed: redSum / count,
    crimsonFrac: crimson / count,
    charcoalFrac: charcoal / count,
  };
}

export function dyeLooksAllBlack(stats: DyeStats): boolean {
  return stats.meanRed < 0.05 && stats.crimsonFrac < 0.05;
}
