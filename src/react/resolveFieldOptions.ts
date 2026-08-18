import { cloneConfig, defaultConfig, sanitizeConfig, type FluidConfig } from "../app/config";

export type FluidFieldOptions = {
  dashboard: boolean;
  perf: boolean;
  persist: boolean;
};

export function resolveFieldOptions(input: {
  dashboard?: boolean;
  perf?: boolean;
  persist?: boolean;
} = {}): FluidFieldOptions {
  return {
    dashboard: Boolean(input.dashboard),
    perf: Boolean(input.perf),
    persist: Boolean(input.persist),
  };
}

/** Initial base look. A partial patch is merged onto defaults, then sanitized. */
export function resolveFieldConfig(patch?: Partial<FluidConfig>): FluidConfig {
  if (!patch) {
    return cloneConfig(defaultConfig);
  }
  return sanitizeConfig({ ...cloneConfig(defaultConfig), ...patch });
}
