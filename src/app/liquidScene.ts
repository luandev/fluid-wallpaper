/** Versioned opt-in contract. Coefficients use a unit-density, unit-short-side domain. */
export type LinearRgb = [number, number, number];
export type LiquidQuality = "auto" | "eco" | "balanced" | "high";
export interface LiquidScene {
  kind: "fluid-ink.scene.v1";
  phases: [
    { viscosity: number; absorption: LinearRgb },
    { viscosity: number; absorption: LinearRgb },
  ];
  pigments: [Pigment, Pigment, Pigment, Pigment];
  surfaceTension: number;
  damping: number;
  stirring: number;
  swirlScale: number;
  dose: number;
  opticalPath: number;
  absorption: number;
  substrate: LinearRgb; // Authored sRGB, unlike absorption coefficients.
  relief: number;
  gloss: number;
  roughness: number;
  detail: boolean;
  quality: LiquidQuality;
}
export interface Pigment {
  id: string;
  phase: 0 | 1;
  absorption: LinearRgb;
}

export function defaultLiquidScene(): LiquidScene {
  return {
    kind: "fluid-ink.scene.v1",
    phases: [
      { viscosity: 0.001, absorption: [0.04, 0.02, 0.01] },
      { viscosity: 0.008, absorption: [0.01, 0.02, 0.04] },
    ],
    pigments: [
      { id: "crimson", phase: 0, absorption: [0.15, 3.5, 2.8] },
      { id: "gold", phase: 0, absorption: [0.1, 0.6, 3.2] },
      { id: "blue", phase: 1, absorption: [3.2, 1.4, 0.15] },
      { id: "violet", phase: 1, absorption: [1.3, 3.1, 0.4] },
    ],
    surfaceTension: 0.0001,
    damping: 0.1,
    // Static-drop validation must precede autonomous motion by default.
    stirring: 0,
    swirlScale: 2,
    dose: 0.6,
    opticalPath: 1,
    absorption: 1,
    substrate: [0.96, 0.94, 0.88],
    relief: 0,
    gloss: 0,
    roughness: 0.35,
    detail: false,
    quality: "auto",
  };
}

/** Reject malformed scenes; do not silently reinterpret legacy presets or carrier identities. */
export function validateLiquidScene(value: unknown): LiquidScene {
  const scene = structuredClone(value) as LiquidScene;
  if (!scene || scene.kind !== "fluid-ink.scene.v1")
    throw new Error("Expected fluid-ink.scene.v1 scene");
  const number = (v: unknown, low: number, high: number, label: string) => {
    if (typeof v !== "number" || !Number.isFinite(v) || v < low || v > high)
      throw new Error(`Invalid ${label}`);
  };
  const rgb = (v: unknown, high: number) => {
    if (!Array.isArray(v) || v.length !== 3)
      throw new Error("Expected RGB triple");
    v.forEach((c) => number(c, 0, high, "RGB coefficient"));
  };
  if (!Array.isArray(scene.phases) || scene.phases.length !== 2)
    throw new Error("Expected two phases");
  scene.phases.forEach((p) => {
    number(p.viscosity, 0, 0.1, "viscosity");
    rgb(p.absorption, 20);
  });
  if (!Array.isArray(scene.pigments) || scene.pigments.length !== 4)
    throw new Error("Expected four stable pigment slots");
  const ids = new Set<string>();
  scene.pigments.forEach((p) => {
    if (
      !p ||
      typeof p.id !== "string" ||
      !p.id ||
      ids.has(p.id) ||
      (p.phase !== 0 && p.phase !== 1)
    )
      throw new Error("Invalid pigment identity/carrier");
    ids.add(p.id);
    rgb(p.absorption, 20);
  });
  for (const [key, max] of Object.entries({
    surfaceTension: 0.01,
    damping: 5,
    stirring: 0.2,
    swirlScale: 8,
    dose: 10,
    opticalPath: 10,
    absorption: 10,
    relief: 1,
    gloss: 1,
    roughness: 1,
  })) {
    number(scene[key as keyof LiquidScene], 0, max, key);
  }
  rgb(scene.substrate, 1);
  if (
    typeof scene.detail !== "boolean" ||
    !["auto", "eco", "balanced", "high"].includes(scene.quality)
  )
    throw new Error("Invalid scene policy");
  return scene;
}

/** Appearance/material edits preserve GPU slots; new carriers/identities require a new scene. */
export function assertSameCarriers(a: LiquidScene, b: LiquidScene): void {
  if (
    a.pigments.some(
      (p, i) => p.id !== b.pigments[i].id || p.phase !== b.pigments[i].phase,
    )
  ) {
    throw new Error(
      "Changing pigment slots or carriers requires assigning a new scene",
    );
  }
}
