import {
  controlSchema,
  defaultConfig,
  VALUE_EMITTER_KINDS,
} from "../app/config";
import {
  MATERIAL_FIELD_HELP,
  EMITTER_FIELD_HELP,
  WIND_FIELD_HELP,
  VALUE_EMITTER_FIELD_HELP,
} from "../app/fieldHelp";
import { defaultLiquidScene } from "../app/liquidScene";
export interface ReferenceEntry {
  path: string;
  group: string;
  help: string;
  value: unknown;
  limits: string;
  reseed: boolean;
}
const extra: Record<string, string> = {
  splatRadius:
    "Pointer velocity splat footprint in normalized field coordinates; small values concentrate the force.",
  dyeSplatRadius:
    "Legacy dye splat footprint. Explicit emitter radii control the current point/pointer emitters.",
  maxDt:
    "Maximum wall-time step in seconds. Keep positive and small (default 1/30); ECO additionally caps and scales this timestep.",

  backgroundMode:
    "video, solid, gradient or transparent. Transparent reveals arbitrary content underneath; it does not pass pointer events through.",
  backgroundColor:
    "Solid background or the first diagonal-gradient color. Six-digit sRGB hex.",
  backgroundColorB: "The second diagonal-gradient color. Six-digit sRGB hex.",
  youtubeUrl:
    "YouTube ID or supported URL. In the dashboard, Music video requests muted autoplay; Enable sound requires a click. The player cannot directly feed the audio analyser.",
  materials:
    "One to four packed pigment channels. Removing a material changes channel interpretation.",
  emitters: "Up to eight dye sources referencing material IDs.",
  windStations: "Up to eight local flow stations.",
  valueEmitters: "Up to eight wave or optional-input signals.",
  valueBindings:
    "Up to sixteen links from signals to supported numeric control paths.",
};
export const reference: ReferenceEntry[] = Object.entries(defaultConfig).map(
  ([path, value]) => {
    const c = controlSchema.find((c) => c.key === path),
      help = c?.help ?? extra[path];
    if (!help) throw new Error(`Missing settings reference: ${path}`);
    return {
      path,
      group: c?.group ?? "Backgrounds and collections",
      help,
      value,
      limits:
        c?.options?.map((o) => o.value).join(" / ") ??
        (c?.min !== undefined
          ? `${c.min}–${c.max}; step ${c.step ?? "continuous"}`
          : typeof value === "boolean"
            ? "true / false"
            : path === "backgroundMode"
              ? "video / solid / gradient / transparent"
              : "See description"),
      reseed: !!c?.reseed,
    };
  },
);
const identities: Record<string, string> = {
  id: "Stable unique identifier. Preserve IDs referenced by emitters or bindings.",
  name: "Human-readable name used in the tuner.",
  materialId: EMITTER_FIELD_HELP.material,
  emitterId: "ID of the value emitter that drives this binding.",
  path: "Supported numeric config path; select the target in the Drivers graph.",
};
const groups = [
  ["materials", MATERIAL_FIELD_HELP],
  ["emitters", EMITTER_FIELD_HELP],
  ["windStations", WIND_FIELD_HELP],
  ["valueEmitters", VALUE_EMITTER_FIELD_HELP],
  ["valueBindings", VALUE_EMITTER_FIELD_HELP],
] as const;
const bounds: Record<string, string> = {
  "emitters.kind": "field / point / pointer",
  "emitters.radius": "0.00005–0.25",
  "windStations.spin": "−1–1",
  "windStations.radius": "0.04–0.45",
  "valueEmitters.kind": VALUE_EMITTER_KINDS.join(" / "),
  "valueEmitters.rate": "0–8 Hz",
  "valueEmitters.from": "−500–500",
  "valueEmitters.to": "−500–500",
  "valueEmitters.scale": "0–4",
};
for (const [group, helpMap] of groups)
  for (const [key, value] of Object.entries(defaultConfig[group][0])) {
    const help = (helpMap as Record<string, string>)[key] ?? identities[key];
    if (!help) throw new Error(`Missing field reference: ${group}.${key}`);
    reference.push({
      path: `${group}[].${key}`,
      group,
      help,
      value,
      limits:
        bounds[`${group}.${key}`] ??
        (typeof value === "number"
          ? "0–1"
          : typeof value === "boolean"
            ? "true / false"
            : key === "color" || key === "colorB"
              ? "#RRGGBB"
              : "See description"),
      reseed: group === "materials" && key === "id",
    });
  }
const liquidHelp: Record<string, string> = {
  kind: "Versioned scene discriminator: fluid-ink.scene.v1.",
  phases:
    "Exactly two carrier phases; each defines viscosity and linear RGB absorption coefficients.",
  pigments:
    "Exactly four stable pigment identities with carrier membership and linear RGB absorption.",
  surfaceTension:
    "Capillary force coefficient; higher values can require smaller stable timesteps.",
  damping: "Velocity damping per simulation time.",
  stirring:
    "Autonomous force strength. Starts at zero; physical convergence remains experimental.",
  swirlScale: "Spatial scale of autonomous stirring.",
  dose: "Injected pigment concentration.",
  opticalPath: "Effective absorption path length, in artistic units.",
  absorption: "Global absorption multiplier.",
  substrate:
    "Opaque background in authored sRGB, decoded for optical composition. Does not support DOM transparency.",
  relief: "Artistic interface relief strength.",
  gloss: "Artistic dielectric highlight strength.",
  roughness: "Highlight spread.",
  detail:
    "Optional advected decorative detail; adds work and is disabled by ECO.",
  quality:
    "auto / eco / balanced / high. ECO reduces workload and simulation speed under sustained load.",
};
const liquidMax: Record<string, number> = {
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
};
const scene = defaultLiquidScene();
for (const [key, value] of Object.entries(scene)) {
  if (!liquidHelp[key]) throw new Error(`Missing liquid reference: ${key}`);
  reference.push({
    path: `scene.${key}`,
    group: "Experimental two-liquid",
    help: liquidHelp[key],
    value,
    limits:
      key in liquidMax
        ? `0–${liquidMax[key]}`
        : key === "substrate"
          ? "Three sRGB values, each 0–1"
          : typeof value === "boolean"
            ? "true / false"
            : "See description",
    reseed: key === "phases" || key === "pigments",
  });
}
for (const [path, value, help, limits] of [
  [
    "phases[].viscosity",
    scene.phases[0].viscosity,
    "Carrier kinematic viscosity. High contrast increases solver cost.",
    "0–0.1",
  ],
  [
    "phases[].absorption",
    scene.phases[0].absorption,
    "Carrier absorption coefficients in linear RGB.",
    "Three values, each 0–20",
  ],
  [
    "pigments[].id",
    scene.pigments[0].id,
    "Stable unique pigment identity. Changing identities requires a new scene.",
    "Unique string",
  ],
  [
    "pigments[].phase",
    scene.pigments[0].phase,
    "Carrier index. Changing membership requires a new scene.",
    "0 / 1",
  ],
  [
    "pigments[].absorption",
    scene.pigments[0].absorption,
    "Pigment absorption coefficients in linear RGB.",
    "Three values, each 0–20",
  ],
] as const)
  reference.push({
    path: `scene.${path}`,
    group: "Experimental two-liquid",
    value,
    help,
    limits,
    reseed: path.includes("id") || path.endsWith(".phase"),
  });
