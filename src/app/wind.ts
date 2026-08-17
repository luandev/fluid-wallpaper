import type { WindStation } from "./config";

export type WindSample = {
  uvX: number;
  uvY: number;
  heading: number;
  speed: number;
  spin: number;
  radius: number;
};

/** Inverse-distance stream plus local 2D vortex, matching `windForce.frag.glsl`. */
export function windForceAt(
  uvX: number,
  uvY: number,
  aspect: number,
  stations: readonly WindSample[],
  strength: number,
): [number, number] {
  let streamX = 0;
  let streamY = 0;
  let streamW = 0;
  let vortexX = 0;
  let vortexY = 0;
  for (const station of stations) {
    const dx = (uvX - station.uvX) * aspect;
    const dy = uvY - station.uvY;
    const r2 = dx * dx + dy * dy;
    const idw = 1 / Math.max(r2, 1e-6);
    const angle = station.heading * Math.PI * 2;
    streamX += Math.cos(angle) * station.speed * idw;
    streamY += Math.sin(angle) * station.speed * idw;
    streamW += idw;
    const radius = Math.max(station.radius, 1e-4);
    const envelope = Math.exp(-r2 / (radius * radius));
    const swirl = station.spin / (r2 + 4e-4);
    vortexX += -dy * swirl * envelope;
    vortexY += dx * swirl * envelope;
  }
  const sx = streamW > 0 ? streamX / streamW : 0;
  const sy = streamW > 0 ? streamY / streamW : 0;
  return [(sx + vortexX) * strength, (sy + vortexY) * strength];
}

export function stationSamples(stations: readonly WindStation[]): WindSample[] {
  return stations
    .filter((station) => station.enabled)
    .map((station) => ({
      uvX: station.uvX,
      uvY: station.uvY,
      heading: station.heading,
      speed: station.speed,
      spin: station.spin,
      radius: station.radius,
    }));
}
