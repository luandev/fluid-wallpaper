/** CPU reference for the original conservative face-flux implementation; no external source copied. */
export function transportLimit(
  h: number,
  maxFaceSpeed: number,
): { gamma: number; dt: number; epsilon: number } {
  const gamma = Math.max(0.001, maxFaceSpeed);
  // epsilon/h=1, gamma>=max|u_component|. Half the 2D diffusion limit provides margin.
  return { gamma, epsilon: h, dt: h / (8 * gamma) };
}

export function capillaryLimit(h: number, sigma: number): number {
  return sigma > 0 ? 0.25 * Math.sqrt(h ** 3 / (Math.PI * sigma)) : Infinity;
}

/** Directional transfer rates, multiplied by donor phase (or its pigment mass).
 * Their difference is centered advective + diffuse-interface compression/diffusion flux.
 */
export function carrierRates(
  velocity: number,
  left: number,
  right: number,
  normalLeft: number,
  normalRight: number,
  gamma: number,
): [number, number] {
  return [
    gamma + 0.5 * (velocity + gamma * normalLeft * (1 - left)),
    gamma - 0.5 * (velocity + gamma * normalRight * (1 - right)),
  ];
}

export function areaGrid(
  area: number,
  aspect: number,
): { width: number; height: number } {
  if (
    !Number.isFinite(aspect) ||
    aspect <= 0 ||
    !Number.isFinite(area) ||
    area < 64
  )
    throw new Error("Invalid grid budget");
  const ratio = Math.min(16, Math.max(1 / 16, aspect));
  const width = Math.max(2, Math.floor(Math.sqrt(area * ratio)));
  return { width, height: Math.max(2, Math.floor(area / width)) };
}

/** Exact overlap of cell averages on a normalized domain. Preserves mean, including portrait resize. */
export function conservativeResample(
  data: ArrayLike<number>,
  width: number,
  height: number,
  nextWidth: number,
  nextHeight: number,
  channels: number,
): Float32Array {
  const out = new Float32Array(nextWidth * nextHeight * channels);
  for (let y = 0; y < nextHeight; y++)
    for (let x = 0; x < nextWidth; x++) {
      const x0 = (x * width) / nextWidth,
        x1 = ((x + 1) * width) / nextWidth;
      const y0 = (y * height) / nextHeight,
        y1 = ((y + 1) * height) / nextHeight;
      for (let j = Math.floor(y0); j < Math.ceil(y1); j++)
        for (let i = Math.floor(x0); i < Math.ceil(x1); i++) {
          const weight =
            (Math.max(0, Math.min(x1, i + 1) - Math.max(x0, i)) *
              Math.max(0, Math.min(y1, j + 1) - Math.max(y0, j))) /
            ((x1 - x0) * (y1 - y0));
          for (let c = 0; c < channels; c++)
            out[(y * nextWidth + x) * channels + c] +=
              data[(j * width + i) * channels + c] * weight;
        }
    }
  return out;
}
