export function dyeMixT(n: number): number {
  const edge0 = -0.55;
  const edge1 = 0.55;
  const x = Math.min(1, Math.max(0, (n - edge0) / (edge1 - edge0)));
  return x * x * (3 - 2 * x);
}

/** 0 = positive composer lobe, 1 = complementary negative lobe. */
export function fieldMask(n: number, noiseOffset: number): number {
  const t = dyeMixT(n);
  const w = Math.min(1, Math.max(0, noiseOffset));
  return t * (1 - w) + (1 - t) * w;
}

export type DyeStats = {
  meanEnergy: number;
  filledFrac: number;
};

export function dyeStatsFromRgba8(pixels: Uint8Array): DyeStats {
  const count = Math.floor(pixels.length / 4);
  if (count === 0) {
    return { meanEnergy: 0, filledFrac: 0 };
  }
  let energySum = 0;
  let filled = 0;
  for (let i = 0; i < count; i += 1) {
    const r = pixels[i * 4] / 255;
    const g = pixels[i * 4 + 1] / 255;
    const b = pixels[i * 4 + 2] / 255;
    const energy = Math.max(r, g, b);
    energySum += energy;
    if (energy > 0.08) {
      filled += 1;
    }
  }
  return {
    meanEnergy: energySum / count,
    filledFrac: filled / count,
  };
}

export function dyeLooksAllBlack(stats: DyeStats): boolean {
  return stats.meanEnergy < 0.04 && stats.filledFrac < 0.05;
}
