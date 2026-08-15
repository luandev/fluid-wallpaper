import {
  cloneConfig,
  sanitizeConfig,
  type FluidConfig,
} from "./config";

export const PRESETS_STORAGE_KEY = "fluid-wallpaper.presets.v1";
export const MAX_PRESETS = 32;

export type FluidPreset = {
  id: string;
  name: string;
  updatedAt: number;
  config: FluidConfig;
};

export function normalizePresetName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

export function sanitizePresetList(raw: unknown): FluidPreset[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const seen = new Set<string>();
  const out: FluidPreset[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") {
      continue;
    }
    const item = entry as Record<string, unknown>;
    const name = typeof item.name === "string" ? normalizePresetName(item.name) : "";
    const id = typeof item.id === "string" && item.id.length > 0 ? item.id : "";
    if (!name || !id || seen.has(id)) {
      continue;
    }
    const updatedAt =
      typeof item.updatedAt === "number" && Number.isFinite(item.updatedAt)
        ? item.updatedAt
        : Date.now();
    seen.add(id);
    out.push({
      id,
      name,
      updatedAt,
      config: sanitizeConfig(item.config),
    });
    if (out.length >= MAX_PRESETS) {
      break;
    }
  }
  return out.sort((a, b) => b.updatedAt - a.updatedAt);
}

export function getPresetFromList(list: readonly FluidPreset[], id: string): FluidPreset | undefined {
  return list.find((preset) => preset.id === id);
}

export function deletePresetFromList(list: readonly FluidPreset[], id: string): FluidPreset[] {
  return list.filter((preset) => preset.id !== id);
}

export function upsertPresetInList(
  list: readonly FluidPreset[],
  name: string,
  config: FluidConfig,
  now = Date.now(),
  createId: () => string = () => crypto.randomUUID(),
): { list: FluidPreset[]; preset: FluidPreset } {
  const cleaned = normalizePresetName(name);
  if (!cleaned) {
    throw new Error("Preset name is required");
  }
  const key = cleaned.toLowerCase();
  const existing = list.find((preset) => preset.name.toLowerCase() === key);
  const preset: FluidPreset = {
    id: existing?.id ?? createId(),
    name: cleaned,
    updatedAt: now,
    config: sanitizeConfig(cloneConfig(config)),
  };
  const without = list.filter((item) => item.id !== preset.id && item.name.toLowerCase() !== key);
  const next = [preset, ...without].sort((a, b) => b.updatedAt - a.updatedAt);
  return { list: next.slice(0, MAX_PRESETS), preset };
}

function readStorage(): unknown {
  try {
    const raw = localStorage.getItem(PRESETS_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    return JSON.parse(raw) as unknown;
  } catch {
    return [];
  }
}

export function loadPresets(): FluidPreset[] {
  return sanitizePresetList(readStorage());
}

export function savePresets(list: readonly FluidPreset[]): void {
  localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(sanitizePresetList(list)));
}

export function getPreset(id: string): FluidPreset | undefined {
  return getPresetFromList(loadPresets(), id);
}

export function upsertPreset(name: string, config: FluidConfig): FluidPreset {
  const { list, preset } = upsertPresetInList(loadPresets(), name, config);
  savePresets(list);
  return preset;
}

export function deletePreset(id: string): FluidPreset[] {
  const next = deletePresetFromList(loadPresets(), id);
  savePresets(next);
  return next;
}
