import {
  EMITTER_DRIVE_FIELDS,
  MATERIAL_DRIVE_FIELDS,
  RESEED_KEYS,
  VALUE_EMITTER_STUB_KINDS,
  WIND_DRIVE_FIELDS,
  cloneConfig,
  controlSchema,
  type FluidConfig,
  type FluidEmitter,
  type FluidMaterial,
  type ValueEmitter,
  type ValueEmitterKind,
  type WindStation,
} from "./config";

export type BindablePath = {
  path: string;
  label: string;
  min: number;
  max: number;
};

export function bindablePaths(config: FluidConfig): BindablePath[] {
  const out: BindablePath[] = [];
  for (const control of controlSchema) {
    if (control.kind !== "range" || control.min === undefined || control.max === undefined) {
      continue;
    }
    if (RESEED_KEYS.has(control.key)) {
      continue;
    }
    out.push({
      path: String(control.key),
      label: `${control.group} · ${control.label}`,
      min: control.min,
      max: control.max,
    });
  }
  for (const material of config.materials) {
    for (const field of MATERIAL_DRIVE_FIELDS) {
      out.push({
        path: `materials.${material.id}.${field.key}`,
        label: `${material.name} · ${field.label}`,
        min: field.min,
        max: field.max,
      });
    }
  }
  for (const emitter of config.emitters) {
    for (const field of EMITTER_DRIVE_FIELDS) {
      out.push({
        path: `emitters.${emitter.id}.${field.key}`,
        label: `${emitter.name} · ${field.label}`,
        min: field.min,
        max: field.max,
      });
    }
  }
  for (const station of config.windStations) {
    for (const field of WIND_DRIVE_FIELDS) {
      out.push({
        path: `windStations.${station.id}.${field.key}`,
        label: `${station.name} · ${field.label}`,
        min: field.min,
        max: field.max,
      });
    }
  }
  return out;
}

export const BINDABLE_PATHS = bindablePaths;

function fract(x: number): number {
  if (!Number.isFinite(x)) {
    return 0;
  }
  return x - Math.floor(x);
}

function hash01(n: number): number {
  const s = Math.sin(n * 127.1) * 43758.5453;
  return s - Math.floor(s);
}

export function wave01(kind: ValueEmitterKind, t: number): number {
  if ((VALUE_EMITTER_STUB_KINDS as readonly string[]).includes(kind)) {
    return 0.5;
  }
  const u = fract(t);
  if (kind === "sine") {
    return 0.5 + 0.5 * Math.sin(u * Math.PI * 2);
  }
  if (kind === "triangle") {
    return u <= 0.5 ? u * 2 : 2 - u * 2;
  }
  if (kind === "saw") {
    return u;
  }
  if (kind === "square") {
    return u < 0.5 ? 0 : 1;
  }
  const i = Math.floor(t);
  const f = t - i;
  const a = hash01(i);
  const b = hash01(i + 1);
  const s = f * f * (3 - 2 * f);
  return a + (b - a) * s;
}

export function evaluateEmitter(emitter: ValueEmitter, elapsed: number): number {
  if (!emitter.enabled) {
    return emitter.from;
  }
  const t = elapsed * Math.max(0, emitter.rate) + emitter.phase;
  const w = wave01(emitter.kind, t);
  return emitter.from + (emitter.to - emitter.from) * w;
}

function parsePath(path: string): string[] {
  return path.split(".").filter(Boolean);
}

export function getPath(config: FluidConfig, path: string): number | undefined {
  const parts = parsePath(path);
  if (parts.length === 1) {
    const value = config[parts[0] as keyof FluidConfig];
    return typeof value === "number" ? value : undefined;
  }
  if (parts.length === 3) {
    const [group, id, field] = parts;
    if (group === "materials") {
      const item = config.materials.find((material) => material.id === id);
      const value = item?.[field as keyof FluidMaterial];
      return typeof value === "number" ? value : undefined;
    }
    if (group === "emitters") {
      const item = config.emitters.find((emitter) => emitter.id === id);
      const value = item?.[field as keyof FluidEmitter];
      return typeof value === "number" ? value : undefined;
    }
    if (group === "windStations") {
      const item = config.windStations.find((station) => station.id === id);
      const value = item?.[field as keyof WindStation];
      return typeof value === "number" ? value : undefined;
    }
  }
  return undefined;
}

export function setPath(config: FluidConfig, path: string, nextValue: number): boolean {
  const parts = parsePath(path);
  if (!Number.isFinite(nextValue)) {
    return false;
  }
  if (parts.length === 1) {
    const key = parts[0] as keyof FluidConfig;
    if (typeof config[key] !== "number") {
      return false;
    }
    (config[key] as number) = nextValue;
    return true;
  }
  if (parts.length === 3) {
    const [group, id, field] = parts;
    if (group === "materials") {
      const item = config.materials.find((material) => material.id === id);
      if (!item || typeof item[field as keyof FluidMaterial] !== "number") {
        return false;
      }
      (item[field as keyof FluidMaterial] as number) = nextValue;
      return true;
    }
    if (group === "emitters") {
      const item = config.emitters.find((emitter) => emitter.id === id);
      if (!item || typeof item[field as keyof FluidEmitter] !== "number") {
        return false;
      }
      (item[field as keyof FluidEmitter] as number) = nextValue;
      return true;
    }
    if (group === "windStations") {
      const item = config.windStations.find((station) => station.id === id);
      if (!item || typeof item[field as keyof WindStation] !== "number") {
        return false;
      }
      (item[field as keyof WindStation] as number) = nextValue;
      return true;
    }
  }
  return false;
}

export function driverNameForPath(config: FluidConfig, path: string): string | undefined {
  const emitters = new Map(config.valueEmitters.map((emitter) => [emitter.id, emitter]));
  for (let i = config.valueBindings.length - 1; i >= 0; i -= 1) {
    const binding = config.valueBindings[i];
    if (binding.path !== path) {
      continue;
    }
    const emitter = emitters.get(binding.emitterId);
    if (emitter?.enabled) {
      return emitter.name;
    }
  }
  return undefined;
}

export function applyDrivers(base: FluidConfig, elapsed: number): FluidConfig {
  const live = cloneConfig(base);
  if (base.valueBindings.length === 0 || base.valueEmitters.length === 0) {
    return live;
  }
  const registry = new Map(bindablePaths(live).map((item) => [item.path, item]));
  const emitters = new Map(live.valueEmitters.map((emitter) => [emitter.id, emitter]));
  const latest = new Map<string, (typeof live.valueBindings)[number]>();
  for (const binding of live.valueBindings) {
    latest.set(binding.path, binding);
  }
  for (const binding of latest.values()) {
    const spec = registry.get(binding.path);
    const emitter = emitters.get(binding.emitterId);
    if (!spec || !emitter?.enabled || binding.amount <= 0) {
      continue;
    }
    const baseValue = getPath(live, binding.path);
    if (baseValue === undefined) {
      continue;
    }
    const driven = evaluateEmitter(emitter, elapsed);
    const mixed = baseValue + (driven - baseValue) * binding.amount;
    const clamped = Math.min(spec.max, Math.max(spec.min, mixed));
    setPath(live, binding.path, clamped);
  }
  return live;
}

export function copyConfigOnto(target: FluidConfig, source: FluidConfig): void {
  Object.assign(target, source);
  target.materials = source.materials;
  target.emitters = source.emitters;
  target.windStations = source.windStations;
  target.valueEmitters = source.valueEmitters;
  target.valueBindings = source.valueBindings;
}
