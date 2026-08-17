import { CHARCOAL, CRIMSON } from "./colors";

export const NOISE_TYPES = ["perlin", "simplex", "value", "worley"] as const;
export type NoiseType = (typeof NOISE_TYPES)[number];

export const EMITTER_KINDS = ["field", "point", "pointer"] as const;
export type EmitterKind = (typeof EMITTER_KINDS)[number];

export const MAX_MATERIALS = 4;
export const MIN_MATERIALS = 1;
export const MAX_EMITTERS = 8;
export const MAX_WIND_STATIONS = 8;
export const MAX_VALUE_EMITTERS = 8;
export const MAX_VALUE_BINDINGS = 16;

export const VALUE_EMITTER_KINDS = [
  "sine",
  "triangle",
  "saw",
  "square",
  "noise",
  "mic",
  "camera",
  "tilt",
] as const;
export type ValueEmitterKind = (typeof VALUE_EMITTER_KINDS)[number];
export const VALUE_EMITTER_WAVE_KINDS = ["sine", "triangle", "saw", "square", "noise"] as const;
export const VALUE_EMITTER_STUB_KINDS = ["mic", "camera", "tilt"] as const;

export const CRIMSON_MATERIAL_ID = "mat-crimson";
export const CHARCOAL_MATERIAL_ID = "mat-charcoal";

const HEX6 = /^#[0-9A-Fa-f]{6}$/;

export function noiseTypeIndex(type: NoiseType): number {
  const index = NOISE_TYPES.indexOf(type);
  return index < 0 ? 0 : index;
}

export function sanitizeNoiseType(value: unknown): NoiseType {
  if (typeof value === "string" && (NOISE_TYPES as readonly string[]).includes(value)) {
    return value as NoiseType;
  }
  return "perlin";
}

export function sanitizeValueEmitterKind(value: unknown): ValueEmitterKind {
  if (typeof value === "string" && (VALUE_EMITTER_KINDS as readonly string[]).includes(value)) {
    return value as ValueEmitterKind;
  }
  return "sine";
}

export function sanitizeEmitterKind(value: unknown): EmitterKind {
  if (typeof value === "string" && (EMITTER_KINDS as readonly string[]).includes(value)) {
    return value as EmitterKind;
  }
  return "field";
}

export function sanitizeHex(value: unknown, fallback: string): string {
  if (typeof value === "string" && HEX6.test(value)) {
    return value;
  }
  return fallback;
}

export type FluidMaterial = {
  id: string;
  name: string;
  enabled: boolean;
  color: string;
  colorB: string;
  viscosity: number;
  roughness: number;
  metallic: number;
  sheen: number;
  glow: number;
};

export type FluidEmitter = {
  id: string;
  name: string;
  enabled: boolean;
  materialId: string;
  kind: EmitterKind;
  rate: number;
  radius: number;
  uvX: number;
  uvY: number;
  noiseOffset: number;
};

/** Sparse 2D sample, like a weather station: stream (heading/speed) plus local spin. */
export type WindStation = {
  id: string;
  name: string;
  enabled: boolean;
  uvX: number;
  uvY: number;
  heading: number;
  speed: number;
  spin: number;
  radius: number;
};

export type ValueEmitter = {
  id: string;
  name: string;
  enabled: boolean;
  kind: ValueEmitterKind;
  rate: number;
  phase: number;
  from: number;
  to: number;
};

export type ValueBinding = {
  id: string;
  emitterId: string;
  path: string;
  amount: number;
};

export type FluidConfig = {
  simResolution: number;
  dyeResolution: number;
  pressureIterations: number;
  vorticity: number;
  velocityDecay: number;
  dyeDecay: number;
  splatRadius: number;
  splatForce: number;
  dyeSplatRadius: number;
  seedVelocityScale: number;
  composerStrength: number;
  composerBroad: number;
  composerMedium: number;
  composerFine: number;
  noiseScale: number;
  noiseTime: number;
  noiseType: NoiseType;
  dyeInject: number;
  warmupSteps: number;
  viewZoom: number;
  contrast: number;
  pointerEnabled: boolean;
  maxDt: number;
  colorTweenSpeed: number;
  wiggleAmount: number;
  windStrength: number;
  materials: FluidMaterial[];
  emitters: FluidEmitter[];
  windStations: WindStation[];
  valueEmitters: ValueEmitter[];
  valueBindings: ValueBinding[];
};

export function createItemId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
  }
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

const EXTRA_MATERIAL_TEMPLATES: ReadonlyArray<Omit<FluidMaterial, "id">> = [
  {
    name: "Wine",
    enabled: true,
    color: "#6B1528",
    colorB: "#4A0E18",
    viscosity: 0.45,
    roughness: 0.35,
    metallic: 0.15,
    sheen: 0.45,
    glow: 0.2,
  },
  {
    name: "Brass",
    enabled: true,
    color: "#C9A227",
    colorB: "#8A6E12",
    viscosity: 0.2,
    roughness: 0.25,
    metallic: 0.8,
    sheen: 0.15,
    glow: 0.1,
  },
];

export function defaultMaterials(): FluidMaterial[] {
  return [
    {
      id: CRIMSON_MATERIAL_ID,
      name: "Crimson",
      enabled: true,
      color: CRIMSON,
      colorB: "#8B1520",
      viscosity: 0.1,
      roughness: 0.45,
      metallic: 0.05,
      sheen: 0.3,
      glow: 0.65,
    },
    {
      id: CHARCOAL_MATERIAL_ID,
      name: "Charcoal",
      enabled: true,
      color: CHARCOAL,
      colorB: "#1A1214",
      viscosity: 0.35,
      roughness: 0.7,
      metallic: 0,
      sheen: 0.1,
      glow: 0,
    },
  ];
}

export function defaultEmitters(): FluidEmitter[] {
  return [
    {
      id: "emit-field-crimson",
      name: "Crimson field",
      enabled: true,
      materialId: CRIMSON_MATERIAL_ID,
      kind: "field",
      rate: 1,
      radius: 0.0009,
      uvX: 0.5,
      uvY: 0.5,
      noiseOffset: 0,
    },
    {
      id: "emit-field-charcoal",
      name: "Charcoal field",
      enabled: true,
      materialId: CHARCOAL_MATERIAL_ID,
      kind: "field",
      rate: 1,
      radius: 0.0009,
      uvX: 0.5,
      uvY: 0.5,
      noiseOffset: 1,
    },
    {
      id: "emit-pointer-crimson",
      name: "Pointer",
      enabled: true,
      materialId: CRIMSON_MATERIAL_ID,
      kind: "pointer",
      rate: 1,
      radius: 0.0009,
      uvX: 0.5,
      uvY: 0.5,
      noiseOffset: 0,
    },
  ];
}

export function materialSlotIndex(materialId: string, materials: readonly FluidMaterial[]): number {
  return materials.findIndex((material) => material.id === materialId);
}

export const defaultConfig: FluidConfig = {
  simResolution: 384,
  dyeResolution: 768,
  pressureIterations: 28,
  vorticity: 2.5,
  velocityDecay: 0.95,
  dyeDecay: 0.002,
  splatRadius: 0.00055,
  splatForce: 1200,
  dyeSplatRadius: 0.0009,
  seedVelocityScale: 10,
  composerStrength: 12,
  composerBroad: 1.1,
  composerMedium: 0.4,
  composerFine: 0.12,
  noiseScale: 1.05,
  noiseTime: 0.28,
  noiseType: "perlin",
  dyeInject: 0.015,
  warmupSteps: 64,
  viewZoom: 0.85,
  contrast: 0.75,
  pointerEnabled: true,
  maxDt: 1 / 30,
  colorTweenSpeed: 0.12,
  wiggleAmount: 0.28,
  windStrength: 16,
  materials: defaultMaterials(),
  emitters: defaultEmitters(),
  windStations: [],
  valueEmitters: [],
  valueBindings: [],
};

export type ControlGroup = "Look" | "Flow" | "Composer" | "Quality" | "Input";

export type ControlDef = {
  key: keyof FluidConfig;
  label: string;
  group: ControlGroup;
  kind: "range" | "color" | "toggle" | "select";
  min?: number;
  max?: number;
  step?: number;
  reseed?: boolean;
  options?: ReadonlyArray<{ value: string; label: string }>;
};

export const controlSchema: ControlDef[] = [
  { key: "colorTweenSpeed", label: "Tween speed", group: "Look", kind: "range", min: 0, max: 1, step: 0.01 },
  { key: "contrast", label: "Contrast", group: "Look", kind: "range", min: 0.4, max: 3, step: 0.05 },
  { key: "viewZoom", label: "View zoom", group: "Look", kind: "range", min: 0.25, max: 2.5, step: 0.01, reseed: true },
  { key: "dyeDecay", label: "Dye decay", group: "Look", kind: "range", min: 0, max: 0.05, step: 0.001 },
  { key: "vorticity", label: "Vorticity", group: "Flow", kind: "range", min: 0, max: 40, step: 0.5 },
  { key: "windStrength", label: "Wind", group: "Flow", kind: "range", min: 0, max: 80, step: 0.5 },
  { key: "velocityDecay", label: "Velocity decay", group: "Flow", kind: "range", min: 0, max: 2, step: 0.01 },
  { key: "seedVelocityScale", label: "Seed velocity", group: "Flow", kind: "range", min: 0, max: 80, step: 0.5, reseed: true },
  { key: "splatForce", label: "Splat force", group: "Flow", kind: "range", min: 0, max: 8000, step: 50 },
  { key: "composerStrength", label: "Strength", group: "Composer", kind: "range", min: 0, max: 80, step: 0.5 },
  { key: "composerBroad", label: "Broad", group: "Composer", kind: "range", min: 0, max: 2, step: 0.01 },
  { key: "composerMedium", label: "Medium", group: "Composer", kind: "range", min: 0, max: 2, step: 0.01 },
  { key: "composerFine", label: "Fine", group: "Composer", kind: "range", min: 0, max: 2, step: 0.01 },
  {
    key: "noiseType",
    label: "Noise",
    group: "Composer",
    kind: "select",
    reseed: true,
    options: [
      { value: "perlin", label: "Perlin" },
      { value: "simplex", label: "Simplex" },
      { value: "value", label: "Value" },
      { value: "worley", label: "Worley" },
    ],
  },
  { key: "noiseScale", label: "Noise scale", group: "Composer", kind: "range", min: 0.2, max: 8, step: 0.05 },
  { key: "noiseTime", label: "Time speed", group: "Composer", kind: "range", min: 0, max: 1.2, step: 0.01 },
  { key: "wiggleAmount", label: "Wiggle", group: "Composer", kind: "range", min: 0, max: 1, step: 0.01 },
  { key: "dyeInject", label: "Dye inject", group: "Composer", kind: "range", min: 0, max: 0.25, step: 0.005 },
  { key: "simResolution", label: "Sim resolution", group: "Quality", kind: "range", min: 128, max: 512, step: 32, reseed: true },
  { key: "dyeResolution", label: "Dye resolution", group: "Quality", kind: "range", min: 256, max: 1024, step: 32, reseed: true },
  { key: "pressureIterations", label: "Pressure iters", group: "Quality", kind: "range", min: 20, max: 40, step: 1, reseed: true },
  { key: "warmupSteps", label: "Warmup steps", group: "Quality", kind: "range", min: 0, max: 120, step: 1, reseed: true },
  { key: "pointerEnabled", label: "Pointer stir", group: "Input", kind: "toggle" },
];

export const RESEED_KEYS: ReadonlySet<keyof FluidConfig> = new Set(
  controlSchema.filter((control) => control.reseed).map((control) => control.key),
);

export type DriveField = {
  key: string;
  label: string;
  min: number;
  max: number;
};

export const MATERIAL_DRIVE_FIELDS: readonly DriveField[] = [
  { key: "viscosity", label: "Viscosity", min: 0, max: 1 },
  { key: "roughness", label: "Roughness", min: 0, max: 1 },
  { key: "metallic", label: "Metallic", min: 0, max: 1 },
  { key: "sheen", label: "Sheen", min: 0, max: 1 },
  { key: "glow", label: "Glow", min: 0, max: 1 },
];

export const EMITTER_DRIVE_FIELDS: readonly DriveField[] = [
  { key: "rate", label: "Rate", min: 0, max: 1 },
  { key: "radius", label: "Radius", min: 0.00005, max: 0.25 },
  { key: "uvX", label: "U", min: 0, max: 1 },
  { key: "uvY", label: "V", min: 0, max: 1 },
  { key: "noiseOffset", label: "Noise offset", min: 0, max: 1 },
];

export const WIND_DRIVE_FIELDS: readonly DriveField[] = [
  { key: "uvX", label: "U", min: 0, max: 1 },
  { key: "uvY", label: "V", min: 0, max: 1 },
  { key: "heading", label: "Heading", min: 0, max: 1 },
  { key: "speed", label: "Speed", min: 0, max: 1 },
  { key: "spin", label: "Spin", min: -1, max: 1 },
  { key: "radius", label: "Radius", min: 0.04, max: 0.45 },
];

function driveField(fields: readonly DriveField[], key: string): DriveField | undefined {
  return fields.find((field) => field.key === key);
}

function isNestedDrivePath(
  id: string,
  field: string,
  items: ReadonlyArray<{ id: string }>,
  fields: readonly DriveField[],
): boolean {
  return items.some((item) => item.id === id) && Boolean(driveField(fields, field));
}

export function isBindablePath(config: FluidConfig, path: string): boolean {
  if (!path || path.length > 96) {
    return false;
  }
  const parts = path.split(".");
  if (parts.length === 1) {
    const control = controlSchema.find((item) => item.key === parts[0]);
    return Boolean(
      control &&
        control.kind === "range" &&
        control.min !== undefined &&
        control.max !== undefined &&
        !RESEED_KEYS.has(control.key),
    );
  }
  if (parts.length !== 3) {
    return false;
  }
  const [group, id, field] = parts;
  if (group === "materials") {
    return isNestedDrivePath(id, field, config.materials, MATERIAL_DRIVE_FIELDS);
  }
  if (group === "emitters") {
    return isNestedDrivePath(id, field, config.emitters, EMITTER_DRIVE_FIELDS);
  }
  if (group === "windStations") {
    return isNestedDrivePath(id, field, config.windStations, WIND_DRIVE_FIELDS);
  }
  return false;
}

export function decayFactor(decayPerSecond: number, dt: number): number {
  return Math.exp(-Math.max(0, decayPerSecond) * Math.max(0, dt));
}

export function cloneMaterial(material: FluidMaterial): FluidMaterial {
  return { ...material };
}

export function cloneEmitter(emitter: FluidEmitter): FluidEmitter {
  return { ...emitter };
}

export function cloneWindStation(station: WindStation): WindStation {
  return { ...station };
}

export function cloneValueEmitter(emitter: ValueEmitter): ValueEmitter {
  return { ...emitter };
}

export function cloneValueBinding(binding: ValueBinding): ValueBinding {
  return { ...binding };
}

export function cloneConfig(config: FluidConfig): FluidConfig {
  return {
    ...config,
    materials: config.materials.map(cloneMaterial),
    emitters: config.emitters.map(cloneEmitter),
    windStations: config.windStations.map(cloneWindStation),
    valueEmitters: (config.valueEmitters ?? []).map(cloneValueEmitter),
    valueBindings: (config.valueBindings ?? []).map(cloneValueBinding),
  };
}

export function mergeConfig(base: FluidConfig, patch: Partial<FluidConfig>): FluidConfig {
  const next = cloneConfig(base);
  for (const key of Object.keys(patch) as (keyof FluidConfig)[]) {
    const value = patch[key];
    if (value === undefined) {
      continue;
    }
    if (key === "materials") {
      next.materials = (value as FluidMaterial[]).map(cloneMaterial);
      continue;
    }
    if (key === "emitters") {
      next.emitters = (value as FluidEmitter[]).map(cloneEmitter);
      continue;
    }
    if (key === "windStations") {
      next.windStations = (value as WindStation[]).map(cloneWindStation);
      continue;
    }
    if (key === "valueEmitters") {
      next.valueEmitters = (value as ValueEmitter[]).map(cloneValueEmitter);
      continue;
    }
    if (key === "valueBindings") {
      next.valueBindings = (value as ValueBinding[]).map(cloneValueBinding);
      continue;
    }
    (next as unknown as Record<string, unknown>)[key] = value;
  }
  return next;
}

export function assertConfig(config: FluidConfig): void {
  if (config.dyeResolution < config.simResolution) {
    throw new Error("dyeResolution must be >= simResolution");
  }
  if (config.pressureIterations < 20 || config.pressureIterations > 40) {
    throw new Error("Phase 1 pressureIterations must stay in 20–40");
  }
}

function clampNumber(value: unknown, fallback: number, min: number, max: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, value));
}

function sanitizeId(value: unknown, fallback: string): string {
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }
  return fallback;
}

function sanitizeName(value: unknown, fallback: string): string {
  if (typeof value === "string") {
    const name = value.trim().replace(/\s+/g, " ");
    if (name.length > 0) {
      return name.slice(0, 32);
    }
  }
  return fallback;
}

export function sanitizeMaterial(raw: unknown, fallback: FluidMaterial, usedIds: Set<string>): FluidMaterial {
  const input = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  let id = sanitizeId(input.id, fallback.id);
  if (usedIds.has(id)) {
    id = createItemId("mat");
  }
  usedIds.add(id);
  return {
    id,
    name: sanitizeName(input.name, fallback.name),
    enabled: typeof input.enabled === "boolean" ? input.enabled : fallback.enabled,
    color: sanitizeHex(input.color, fallback.color),
    colorB: sanitizeHex(input.colorB, fallback.colorB),
    viscosity: clampNumber(input.viscosity, fallback.viscosity, 0, 1),
    roughness: clampNumber(input.roughness, fallback.roughness, 0, 1),
    metallic: clampNumber(input.metallic, fallback.metallic, 0, 1),
    sheen: clampNumber(input.sheen, fallback.sheen, 0, 1),
    glow: clampNumber(input.glow, fallback.glow, 0, 1),
  };
}

export function sanitizeEmitter(
  raw: unknown,
  fallback: FluidEmitter,
  materialIds: ReadonlySet<string>,
  usedIds: Set<string>,
): FluidEmitter {
  const input = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  let id = sanitizeId(input.id, fallback.id);
  if (usedIds.has(id)) {
    id = createItemId("emit");
  }
  usedIds.add(id);
  const requestedMaterial =
    typeof input.materialId === "string" && materialIds.has(input.materialId)
      ? input.materialId
      : fallback.materialId;
  const materialId = materialIds.has(requestedMaterial)
    ? requestedMaterial
    : [...materialIds][0] ?? CRIMSON_MATERIAL_ID;
  return {
    id,
    name: sanitizeName(input.name, fallback.name),
    enabled: typeof input.enabled === "boolean" ? input.enabled : fallback.enabled,
    materialId,
    kind: sanitizeEmitterKind(input.kind),
    rate: clampNumber(input.rate, fallback.rate, 0, 1),
    radius: clampNumber(input.radius, fallback.radius, 0.00005, 0.25),
    uvX: clampNumber(input.uvX, fallback.uvX, 0, 1),
    uvY: clampNumber(input.uvY, fallback.uvY, 0, 1),
    noiseOffset: clampNumber(input.noiseOffset, fallback.noiseOffset, 0, 1),
  };
}

function sanitizeMaterials(raw: unknown, legacy?: Record<string, unknown>): FluidMaterial[] {
  const fallbacks = defaultMaterials();
  if (!Array.isArray(raw)) {
    const migrated = fallbacks.map(cloneMaterial);
    if (legacy) {
      migrated[0] = {
        ...migrated[0],
        color: sanitizeHex(legacy.crimson, migrated[0].color),
        colorB: sanitizeHex(legacy.crimsonB, migrated[0].colorB),
      };
      migrated[1] = {
        ...migrated[1],
        color: sanitizeHex(legacy.charcoal, migrated[1].color),
        colorB: sanitizeHex(legacy.charcoalB, migrated[1].colorB),
      };
    }
    return migrated;
  }
  const usedIds = new Set<string>();
  const out: FluidMaterial[] = [];
  for (let i = 0; i < raw.length && out.length < MAX_MATERIALS; i += 1) {
    const fallback = fallbacks[Math.min(i, fallbacks.length - 1)] ?? fallbacks[0];
    out.push(sanitizeMaterial(raw[i], fallback, usedIds));
  }
  if (out.length < MIN_MATERIALS) {
    return fallbacks.map(cloneMaterial);
  }
  return out;
}

function sanitizeEmitters(raw: unknown, materials: readonly FluidMaterial[]): FluidEmitter[] {
  const fallbacks = defaultEmitters();
  const materialIds = new Set(materials.map((material) => material.id));
  if (!Array.isArray(raw)) {
    return fallbacks.map((emitter) => ({
      ...cloneEmitter(emitter),
      materialId: materialIds.has(emitter.materialId) ? emitter.materialId : [...materialIds][0] ?? emitter.materialId,
    }));
  }
  const usedIds = new Set<string>();
  const out: FluidEmitter[] = [];
  for (let i = 0; i < raw.length && out.length < MAX_EMITTERS; i += 1) {
    const fallback = fallbacks[Math.min(i, fallbacks.length - 1)] ?? fallbacks[0];
    out.push(sanitizeEmitter(raw[i], fallback, materialIds, usedIds));
  }
  return out;
}

export function createMaterial(existing: readonly FluidMaterial[]): FluidMaterial | undefined {
  if (existing.length >= MAX_MATERIALS) {
    return undefined;
  }
  const template = EXTRA_MATERIAL_TEMPLATES[existing.length - 2] ?? EXTRA_MATERIAL_TEMPLATES[1];
  const usedIds = new Set(existing.map((material) => material.id));
  return sanitizeMaterial({ ...template, id: createItemId("mat") }, { ...template, id: "mat-new" }, usedIds);
}

export function createEmitter(existing: readonly FluidEmitter[], materials: readonly FluidMaterial[]): FluidEmitter | undefined {
  if (existing.length >= MAX_EMITTERS) {
    return undefined;
  }
  const materialId = materials[0]?.id ?? CRIMSON_MATERIAL_ID;
  const usedIds = new Set(existing.map((emitter) => emitter.id));
  const fallback: FluidEmitter = {
    id: "emit-new",
    name: `Emitter ${existing.length + 1}`,
    enabled: true,
    materialId,
    kind: "point",
    rate: 0.45,
    radius: 0.012,
    uvX: 0.5,
    uvY: 0.5,
    noiseOffset: 0,
  };
  return sanitizeEmitter({ ...fallback, id: createItemId("emit") }, fallback, new Set(materials.map((m) => m.id)), usedIds);
}

const FALLBACK_WIND: WindStation = {
  id: "wind-new",
  name: "Station",
  enabled: true,
  uvX: 0.5,
  uvY: 0.5,
  heading: 0.12,
  speed: 0.55,
  spin: 0.35,
  radius: 0.18,
};

export function sanitizeWindStation(raw: unknown, fallback: WindStation, usedIds: Set<string>): WindStation {
  const input = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  let id = sanitizeId(input.id, fallback.id);
  if (usedIds.has(id)) {
    id = createItemId("wind");
  }
  usedIds.add(id);
  return {
    id,
    name: sanitizeName(input.name, fallback.name),
    enabled: typeof input.enabled === "boolean" ? input.enabled : fallback.enabled,
    uvX: clampNumber(input.uvX, fallback.uvX, 0, 1),
    uvY: clampNumber(input.uvY, fallback.uvY, 0, 1),
    heading: clampNumber(input.heading, fallback.heading, 0, 1),
    speed: clampNumber(input.speed, fallback.speed, 0, 1),
    spin: clampNumber(input.spin, fallback.spin, -1, 1),
    radius: clampNumber(input.radius, fallback.radius, 0.04, 0.45),
  };
}

function sanitizeWindStations(raw: unknown): WindStation[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const usedIds = new Set<string>();
  const out: WindStation[] = [];
  for (let i = 0; i < raw.length && out.length < MAX_WIND_STATIONS; i += 1) {
    out.push(sanitizeWindStation(raw[i], FALLBACK_WIND, usedIds));
  }
  return out;
}

export function createWindStation(existing: readonly WindStation[]): WindStation | undefined {
  if (existing.length >= MAX_WIND_STATIONS) {
    return undefined;
  }
  const usedIds = new Set(existing.map((station) => station.id));
  return sanitizeWindStation(
    {
      ...FALLBACK_WIND,
      id: createItemId("wind"),
      name: `Station ${existing.length + 1}`,
    },
    FALLBACK_WIND,
    usedIds,
  );
}

export function scatterWindStations(count = 4, random: () => number = Math.random): WindStation[] {
  const n = Math.min(MAX_WIND_STATIONS, Math.max(1, Math.round(count)));
  const usedIds = new Set<string>();
  const out: WindStation[] = [];
  for (let i = 0; i < n; i += 1) {
    out.push(
      sanitizeWindStation(
        {
          id: createItemId("wind"),
          name: `Station ${i + 1}`,
          enabled: true,
          uvX: 0.08 + random() * 0.84,
          uvY: 0.08 + random() * 0.84,
          heading: random(),
          speed: 0.25 + random() * 0.6,
          spin: random() * 1.6 - 0.8,
          radius: 0.1 + random() * 0.2,
        },
        FALLBACK_WIND,
        usedIds,
      ),
    );
  }
  return out;
}

const FALLBACK_VALUE_EMITTER: ValueEmitter = {
  id: "wave-new",
  name: "Wave",
  enabled: true,
  kind: "sine",
  rate: 0.25,
  phase: 0,
  from: 0,
  to: 1,
};

const FALLBACK_VALUE_BINDING: ValueBinding = {
  id: "bind-new",
  emitterId: "",
  path: "vorticity",
  amount: 1,
};

export function sanitizeValueEmitter(raw: unknown, fallback: ValueEmitter, usedIds: Set<string>): ValueEmitter {
  const input = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  let id = sanitizeId(input.id, fallback.id);
  if (usedIds.has(id)) {
    id = createItemId("wave");
  }
  usedIds.add(id);
  return {
    id,
    name: sanitizeName(input.name, fallback.name),
    enabled: typeof input.enabled === "boolean" ? input.enabled : fallback.enabled,
    kind: sanitizeValueEmitterKind(input.kind),
    rate: clampNumber(input.rate, fallback.rate, 0, 8),
    phase: clampNumber(input.phase, fallback.phase, 0, 1),
    from: clampNumber(input.from, fallback.from, -500, 500),
    to: clampNumber(input.to, fallback.to, -500, 500),
  };
}

function sanitizeValueEmitters(raw: unknown): ValueEmitter[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const usedIds = new Set<string>();
  const out: ValueEmitter[] = [];
  for (let i = 0; i < raw.length && out.length < MAX_VALUE_EMITTERS; i += 1) {
    out.push(sanitizeValueEmitter(raw[i], FALLBACK_VALUE_EMITTER, usedIds));
  }
  return out;
}

export function sanitizeValueBinding(
  raw: unknown,
  fallback: ValueBinding,
  config: FluidConfig,
  usedIds: Set<string>,
): ValueBinding | undefined {
  const input = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const emitterId = sanitizeId(input.emitterId, fallback.emitterId);
  if (!config.valueEmitters.some((emitter) => emitter.id === emitterId)) {
    return undefined;
  }
  const path = typeof input.path === "string" ? input.path.trim() : fallback.path;
  if (!isBindablePath(config, path)) {
    return undefined;
  }
  let id = sanitizeId(input.id, fallback.id || createItemId("bind"));
  if (usedIds.has(id)) {
    id = createItemId("bind");
  }
  usedIds.add(id);
  return {
    id,
    emitterId,
    path,
    amount: clampNumber(input.amount, fallback.amount, 0, 1),
  };
}

function sanitizeValueBindings(raw: unknown, config: FluidConfig): ValueBinding[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const usedIds = new Set<string>();
  const out: ValueBinding[] = [];
  for (let i = 0; i < raw.length && out.length < MAX_VALUE_BINDINGS; i += 1) {
    const binding = sanitizeValueBinding(raw[i], FALLBACK_VALUE_BINDING, config, usedIds);
    if (binding) {
      out.push(binding);
    }
  }
  return out;
}

export function createValueEmitter(existing: readonly ValueEmitter[]): ValueEmitter | undefined {
  if (existing.length >= MAX_VALUE_EMITTERS) {
    return undefined;
  }
  const usedIds = new Set(existing.map((emitter) => emitter.id));
  return sanitizeValueEmitter(
    {
      ...FALLBACK_VALUE_EMITTER,
      id: createItemId("wave"),
      name: `Wave ${existing.length + 1}`,
    },
    FALLBACK_VALUE_EMITTER,
    usedIds,
  );
}

export function createValueBinding(config: FluidConfig, path: string): ValueBinding | undefined {
  if (config.valueBindings.length >= MAX_VALUE_BINDINGS) {
    return undefined;
  }
  const emitterId = config.valueEmitters[0]?.id ?? "";
  if (!emitterId) {
    return undefined;
  }
  const usedIds = new Set(config.valueBindings.map((binding) => binding.id));
  return sanitizeValueBinding(
    {
      id: createItemId("bind"),
      emitterId,
      path,
      amount: 1,
    },
    { ...FALLBACK_VALUE_BINDING, emitterId, path },
    config,
    usedIds,
  );
}

export function clampConfig(config: FluidConfig): FluidConfig {
  const next = cloneConfig(config);
  next.noiseType = sanitizeNoiseType(next.noiseType);
  for (const control of controlSchema) {
    if (control.kind !== "range" || control.min === undefined || control.max === undefined) {
      continue;
    }
    const value = next[control.key];
    if (typeof value !== "number") {
      continue;
    }
    const stepped =
      control.step && control.step >= 1
        ? Math.round(value / control.step) * control.step
        : value;
    (next[control.key] as number) = Math.min(control.max, Math.max(control.min, stepped));
  }
  if (next.dyeResolution < next.simResolution) {
    next.dyeResolution = next.simResolution;
  }
  const usedMaterialIds = new Set<string>();
  next.materials = next.materials.slice(0, MAX_MATERIALS).map((material, index) =>
    sanitizeMaterial(material, defaultMaterials()[Math.min(index, 1)], usedMaterialIds),
  );
  if (next.materials.length < MIN_MATERIALS) {
    next.materials = defaultMaterials();
  }
  const materialIds = new Set(next.materials.map((material) => material.id));
  const usedEmitterIds = new Set<string>();
  next.emitters = next.emitters.slice(0, MAX_EMITTERS).map((emitter, index) =>
    sanitizeEmitter(emitter, defaultEmitters()[Math.min(index, defaultEmitters().length - 1)], materialIds, usedEmitterIds),
  );
  const usedWindIds = new Set<string>();
  next.windStations = (next.windStations ?? []).slice(0, MAX_WIND_STATIONS).map((station) =>
    sanitizeWindStation(station, FALLBACK_WIND, usedWindIds),
  );
  const usedWaveIds = new Set<string>();
  next.valueEmitters = (next.valueEmitters ?? []).slice(0, MAX_VALUE_EMITTERS).map((emitter) =>
    sanitizeValueEmitter(emitter, FALLBACK_VALUE_EMITTER, usedWaveIds),
  );
  next.valueBindings = sanitizeValueBindings(next.valueBindings ?? [], next);
  return next;
}

export function sanitizeConfig(raw: unknown): FluidConfig {
  if (!raw || typeof raw !== "object") {
    return cloneConfig(defaultConfig);
  }
  const input = raw as Record<string, unknown>;
  const next = cloneConfig(defaultConfig);
  for (const key of Object.keys(defaultConfig) as (keyof FluidConfig)[]) {
    if (
      key === "materials" ||
      key === "emitters" ||
      key === "windStations" ||
      key === "valueEmitters" ||
      key === "valueBindings"
    ) {
      continue;
    }
    const value = input[key];
    if (value === undefined) {
      continue;
    }
    if (key === "noiseType") {
      next.noiseType = sanitizeNoiseType(value);
      continue;
    }
    if (typeof defaultConfig[key] === "number" && typeof value === "number" && Number.isFinite(value)) {
      (next[key] as number) = value;
    } else if (typeof defaultConfig[key] === "boolean" && typeof value === "boolean") {
      (next[key] as boolean) = value;
    }
  }
  next.materials = sanitizeMaterials(input.materials, input);
  next.emitters = sanitizeEmitters(input.emitters, next.materials);
  next.windStations = sanitizeWindStations(input.windStations);
  next.valueEmitters = sanitizeValueEmitters(input.valueEmitters);
  next.valueBindings = sanitizeValueBindings(input.valueBindings, next);
  return clampConfig(next);
}
