import type { FluidConfig } from "./config";

export type LiveMotion = {
  noiseTime: number;
  noiseScale: number;
};

function fade(t: number): number {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function hash13(x: number, y: number, z: number): number {
  let px = fract(x * 0.1031);
  let py = fract(y * 0.1031);
  let pz = fract(z * 0.1031);
  const d = px * (py + 33.33) + py * (pz + 33.33) + pz * (px + 33.33);
  px = fract(px + d);
  py = fract(py + d);
  pz = fract(pz + d);
  return fract((px + py) * pz);
}

function fract(n: number): number {
  return n - Math.floor(n);
}

function perlinGrad3(ix: number, iy: number, iz: number): [number, number, number] {
  const n = hash13(ix, iy, iz);
  const a = n * Math.PI * 2;
  const b = fract(n * 17) * Math.PI * 2;
  return [Math.sin(a) * Math.cos(b), Math.sin(a) * Math.sin(b), Math.cos(a)];
}

function dot3(g: readonly [number, number, number], x: number, y: number, z: number): number {
  return g[0] * x + g[1] * y + g[2] * z;
}

/** Classic Perlin in ~[-1, 1], matching the GLSL composer family. */
export function perlin3(x: number, y: number, z: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const iz = Math.floor(z);
  const fx = x - ix;
  const fy = y - iy;
  const fz = z - iz;
  const u = fade(fx);
  const v = fade(fy);
  const w = fade(fz);
  const n000 = dot3(perlinGrad3(ix, iy, iz), fx, fy, fz);
  const n100 = dot3(perlinGrad3(ix + 1, iy, iz), fx - 1, fy, fz);
  const n010 = dot3(perlinGrad3(ix, iy + 1, iz), fx, fy - 1, fz);
  const n110 = dot3(perlinGrad3(ix + 1, iy + 1, iz), fx - 1, fy - 1, fz);
  const n001 = dot3(perlinGrad3(ix, iy, iz + 1), fx, fy, fz - 1);
  const n101 = dot3(perlinGrad3(ix + 1, iy, iz + 1), fx - 1, fy, fz - 1);
  const n011 = dot3(perlinGrad3(ix, iy + 1, iz + 1), fx, fy - 1, fz - 1);
  const n111 = dot3(perlinGrad3(ix + 1, iy + 1, iz + 1), fx - 1, fy - 1, fz - 1);
  const nx00 = n000 + (n100 - n000) * u;
  const nx10 = n010 + (n110 - n010) * u;
  const nx01 = n001 + (n101 - n001) * u;
  const nx11 = n011 + (n111 - n011) * u;
  const nxy0 = nx00 + (nx10 - nx00) * v;
  const nxy1 = nx01 + (nx11 - nx01) * v;
  return nxy0 + (nxy1 - nxy0) * w;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function wiggleMotion(config: FluidConfig, elapsed: number): LiveMotion {
  const amount = Math.max(0, config.wiggleAmount);
  if (amount <= 0) {
    return { noiseTime: config.noiseTime, noiseScale: config.noiseScale };
  }
  // Slow independent Perlin samples so intensity breathes instead of flickering.
  const nTime = perlin3(elapsed * 0.17, 2.1, 0.4);
  const nScale = perlin3(elapsed * 0.13 + 11.0, 5.7, 1.9);
  const timeMul = 1 + nTime * amount;
  const scaleMul = 1 + nScale * amount;
  return {
    noiseTime: clamp(config.noiseTime * timeMul, 0, 1.2),
    noiseScale: clamp(config.noiseScale * scaleMul, 0.2, 8),
  };
}
