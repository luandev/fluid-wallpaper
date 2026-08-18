import {
  MAX_VALUE_BINDINGS,
  createItemId,
  isBindablePath,
  type FluidConfig,
  type ValueBinding,
} from "../../app/config";

/** Last binding wins per path. Rejects a new path when already at cap. */
export function connectPorts(
  config: FluidConfig,
  emitterId: string,
  path: string,
): ValueBinding[] | undefined {
  if (!config.valueEmitters.some((emitter) => emitter.id === emitterId)) {
    return undefined;
  }
  if (!isBindablePath(config, path)) {
    return undefined;
  }
  const existing = config.valueBindings.find((binding) => binding.path === path);
  const without = config.valueBindings.filter((binding) => binding.path !== path);
  if (!existing && without.length >= MAX_VALUE_BINDINGS) {
    return undefined;
  }
  const next: ValueBinding = existing
    ? { ...existing, emitterId, path }
    : { id: createItemId("bind"), emitterId, path, amount: 1 };
  return [...without, next];
}

export function removeBinding(bindings: readonly ValueBinding[], id: string): ValueBinding[] {
  return bindings.filter((binding) => binding.id !== id);
}

/** Last binding per path, matching applyDrivers. */
export function latestBindings(bindings: readonly ValueBinding[]): ValueBinding[] {
  const latest = new Map<string, ValueBinding>();
  for (const binding of bindings) {
    latest.set(binding.path, binding);
  }
  return [...latest.values()];
}
