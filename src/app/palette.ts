export type Rgb = [number, number, number];

export type DerivedPalette = {
  charcoal: Rgb;
  crimson: Rgb;
  wine: Rgb;
  ember: Rgb;
  slate: Rgb;
  plum: Rgb;
  ash: Rgb;
};

export type BlendWeights = {
  add: number;
  mul: number;
  burn: number;
};

function clamp01(x: number): number {
  return Math.min(1, Math.max(0, x));
}

export function luma(c: readonly [number, number, number]): number {
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}

export function mixRgb(
  a: readonly [number, number, number],
  b: readonly [number, number, number],
  t: number,
): Rgb {
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ];
}

export function screenRgb(a: Rgb, b: Rgb): Rgb {
  return [
    1 - (1 - a[0]) * (1 - b[0]),
    1 - (1 - a[1]) * (1 - b[1]),
    1 - (1 - a[2]) * (1 - b[2]),
  ];
}

export function multiplyRgb(a: Rgb, b: Rgb): Rgb {
  return [a[0] * b[0], a[1] * b[1], a[2] * b[2]];
}

export function colorBurnRgb(base: Rgb, blend: Rgb): Rgb {
  return [
    clamp01(1 - (1 - base[0]) / Math.max(blend[0], 0.06)),
    clamp01(1 - (1 - base[1]) / Math.max(blend[1], 0.06)),
    clamp01(1 - (1 - base[2]) / Math.max(blend[2], 0.06)),
  ];
}

export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp01((x - edge0) / Math.max(edge1 - edge0, 1e-6));
  return t * t * (3 - 2 * t);
}

export function derivePalette(
  charcoal: readonly [number, number, number],
  crimson: readonly [number, number, number],
): DerivedPalette {
  const delta: Rgb = [crimson[0] - charcoal[0], crimson[1] - charcoal[1], crimson[2] - charcoal[2]];
  const dried: Rgb = [
    crimson[0] * crimson[0] / Math.max(crimson[0], 0.12),
    crimson[1] * crimson[1] / Math.max(crimson[0], 0.12),
    crimson[2] * crimson[2] / Math.max(crimson[0], 0.12),
  ];
  const wine = mixRgb(charcoal, dried, 0.72);
  const emberLift: Rgb = [
    clamp01(crimson[0] + delta[0] * 0.42),
    clamp01(crimson[1] + delta[1] * 0.42 + (crimson[0] - crimson[1]) * 0.16),
    clamp01(crimson[2] + delta[2] * 0.18),
  ];
  const ember = mixRgb(crimson, emberLift, 0.7);
  const inverse: Rgb = [1 - crimson[0], 1 - crimson[1], 1 - crimson[2]];
  const slate = mixRgb(charcoal, mixRgb(charcoal, inverse, 0.22), 0.55);
  const plum = mixRgb(wine, mixRgb(crimson, slate, 0.5), 0.42);
  const ash = mixRgb(charcoal, mixRgb(charcoal, crimson, 0.16), 0.4);
  return {
    charcoal: [charcoal[0], charcoal[1], charcoal[2]],
    crimson: [crimson[0], crimson[1], crimson[2]],
    wine,
    ember,
    slate,
    plum,
    ash,
  };
}

export function blendWeights(concentration: number): BlendWeights {
  const c = Math.max(0, concentration);
  const add = 1 - smoothstep(0.08, 0.38, c);
  const burn = smoothstep(0.72, 0.98, c);
  const mul = Math.max(0, 1 - add - burn);
  const sum = add + mul + burn;
  return { add: add / sum, mul: mul / sum, burn: burn / sum };
}

export function concentrationFromDye(
  sample: readonly [number, number, number],
  charcoal: readonly [number, number, number],
  crimson: readonly [number, number, number],
): number {
  const lo = charcoal[0];
  const hi = Math.max(crimson[0], lo + 1e-4);
  return (sample[0] - lo) / (hi - lo);
}

export function gradePigment(
  concentration: number,
  edge: number,
  charcoal: readonly [number, number, number],
  crimson: readonly [number, number, number],
  contrast = 1,
): Rgb {
  const palette = derivePalette(charcoal, crimson);
  const contrastT = clamp01((contrast - 0.4) / 2.6);
  const lo = mixNumber(0.05, 0.22, contrastT);
  const hi = mixNumber(0.85, 0.5, contrastT);
  const body = smoothstep(lo, hi, concentration);
  const overshoot = Math.max(concentration - 1, 0);
  const weights = blendWeights(body);
  const wineBand = mixRgb(palette.wine, palette.plum, smoothstep(0.25, 0.6, body));
  const paint = mixRgb(palette.charcoal, mixRgb(wineBand, palette.crimson, smoothstep(0.45, 0.95, body)), body);
  const addPass = screenRgb(palette.charcoal, [
    paint[0] * body,
    paint[1] * body,
    paint[2] * body,
  ]);
  const mulPass = mixRgb(
    paint,
    multiplyRgb(mixRgb(palette.charcoal, paint, 0.88), mixRgb([1, 1, 1], wineBand, 0.22)),
    0.35,
  );
  const burnPass = mixRgb(
    mixRgb(palette.wine, paint, 0.55),
    colorBurnRgb(mixRgb(palette.wine, palette.crimson, 0.28), mixRgb([0.22, 0.22, 0.22], palette.crimson, body)),
    smoothstep(0.7, 1, body),
  );
  let color: Rgb = [
    addPass[0] * weights.add + mulPass[0] * weights.mul + burnPass[0] * weights.burn,
    addPass[1] * weights.add + mulPass[1] * weights.mul + burnPass[1] * weights.burn,
    addPass[2] * weights.add + mulPass[2] * weights.mul + burnPass[2] * weights.burn,
  ];
  const filament = smoothstep(0.08, 0.4, clamp01(edge));
  color = mixRgb(color, palette.slate, filament * (1 - body) * 0.18);
  color = mixRgb(color, palette.plum, filament * body * (1 - body) * 0.22);
  color = mixRgb(color, palette.ember, filament * body * 0.12);
  color = mixRgb(color, palette.ash, (1 - body) * (1 - filament) * 0.08);
  const bloom = 1 - Math.exp(-overshoot * 1.85);
  color = [
    clamp01(color[0] + palette.ember[0] * bloom * 0.55),
    clamp01(color[1] + palette.ember[1] * bloom * 0.55),
    clamp01(color[2] + palette.ember[2] * bloom * 0.55),
  ];
  color = mixRgb(color, palette.ember, smoothstep(0.78, 1.25, concentration) * 0.4);
  color = mixRgb(color, [Math.min(palette.ember[0] * 1.12, 1), Math.min(palette.ember[1] * 1.12, 1), Math.min(palette.ember[2] * 1.12, 1)], body ** 5 * 0.22);
  return color;
}

function mixNumber(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
