import { cloneConfig, defaultConfig, sanitizeConfig, type FluidConfig } from "./config";

export const CONFIG_STORAGE_KEY = "fluid-wallpaper.config.v9";
const LEGACY_STORAGE_KEY = "fluid-wallpaper.config.v8";

export function hasStoredConfig(): boolean {
  try {
    return Boolean(localStorage.getItem(CONFIG_STORAGE_KEY) ?? localStorage.getItem(LEGACY_STORAGE_KEY));
  } catch {
    return false;
  }
}

export function loadStoredConfig(): FluidConfig {
  try {
    const raw = localStorage.getItem(CONFIG_STORAGE_KEY) ?? localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) {
      return cloneConfig(defaultConfig);
    }
    return sanitizeConfig(JSON.parse(raw) as unknown);
  } catch {
    return cloneConfig(defaultConfig);
  }
}

export function saveStoredConfig(config: FluidConfig): void {
  localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
}
