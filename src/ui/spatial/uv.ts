export type ViewRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export type Uv = {
  u: number;
  v: number;
};

function clamp01(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.min(1, Math.max(0, value));
}

/** Map client pixels to field UV. V is 0 at the bottom, matching pointer stir. */
export function clientToUv(clientX: number, clientY: number, rect: ViewRect): Uv {
  const width = Math.max(rect.width, 1);
  const height = Math.max(rect.height, 1);
  return {
    u: clamp01((clientX - rect.left) / width),
    v: clamp01(1 - (clientY - rect.top) / height),
  };
}

export function uvToClient(uv: Uv, rect: ViewRect): { x: number; y: number } {
  const width = Math.max(rect.width, 1);
  const height = Math.max(rect.height, 1);
  return {
    x: rect.left + clamp01(uv.u) * width,
    y: rect.top + (1 - clamp01(uv.v)) * height,
  };
}

export function radiusToPixels(radius: number, rect: ViewRect): number {
  const span = Math.min(Math.max(rect.width, 1), Math.max(rect.height, 1));
  return Math.max(8, clamp01(radius) * span);
}
